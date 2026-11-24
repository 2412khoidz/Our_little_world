// Uses node-postgres from the local verifier. Run only against a disposable local DB.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const process = require('node:process');
const { setTimeout: delay } = require('node:timers/promises');
const { Client } = require('pg');

const url = new URL(process.env.OLW_SQL_TEST_DATABASE_URL);
assert(['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname), 'Use a disposable loopback PostgreSQL database');

async function run() {
  const clients = [];
  const actors = Array.from({ length: 5 }, () => randomUUID());
  const [owner, partner, secondOwner, candidateA, candidateB] = actors;
  const connect = async (actor) => {
    const client = new Client({ connectionString: url.href, statement_timeout: 8000 });
    await client.connect();
    clients.push(client);
    if (actor) {
      await client.query('SET ROLE authenticated');
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [actor]);
    }
    return client;
  };

  const createWorld = async (session) => (
    await session.query("SELECT public.create_couple_world('Race fixture', 'Owner', '{}'::jsonb) AS id")
  ).rows[0].id;

  const createInvite = async (session, world) => (
    await session.query('SELECT invite_code FROM public.create_world_invite($1, 24)', [world])
  ).rows[0].invite_code;

  const redeem = (session, code) => session.query(
    "SELECT public.redeem_world_invite($1, 'Partner', '{}'::jsonb) AS world", [code],
  );

  const backendPid = async (session) => (await session.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

  const waitForBlock = async (observer, blockerPid, blockedPid) => {
    for (let attempt = 0; attempt < 80; attempt++) {
      const status = await observer.query('SELECT $1 = ANY(pg_blocking_pids($2)) AS waiting', [blockerPid, blockedPid]);
      if (status.rows[0].waiting) return true;
      await delay(25);
    }
    return false;
  };

  let admin;
  try {
    admin = await connect();
    await admin.query('INSERT INTO auth.users(id) SELECT unnest($1::uuid[])', [actors]);
    const ownerSession = await connect(owner);
    const partnerSession = await connect(partner);
    const ownerOtherSession = await connect(owner);
    const world = await createWorld(ownerSession);
    const code = await createInvite(ownerSession, world);

    // Hold the world row, then wait until redeem is blocked on it before rotating.
    // Redeem must not hold the invite row while waiting for the world.
    const rotation = await connect();
    const rotationPid = await backendPid(rotation);
    const redeemPid = await backendPid(partnerSession);
    await rotation.query('BEGIN');
    await rotation.query('SELECT id FROM public.worlds WHERE id = $1 FOR UPDATE', [world]);
    await rotation.query('SET LOCAL ROLE authenticated');
    await rotation.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [owner]);
    const redeemResult = redeem(partnerSession, code).then(
      () => 'success',
      (error) => error.message,
    );
    assert(await waitForBlock(admin, rotationPid, redeemPid), 'Redeem did not wait for the world lock');
    const newCode = await createInvite(rotation, world);
    assert.notEqual(newCode, code);
    await rotation.query('COMMIT');
    assert.equal(await redeemResult, 'INVITE_INVALID');
    assert.equal((await redeem(partnerSession, newCode)).rows[0].world, world);
    console.log('Invite rotation wins against a concurrent redeem without deadlock');

    // Both clients try to claim a single remaining slot.
    const otherOwner = await connect(secondOwner);
    const secondWorld = await createWorld(otherOwner);
    const secondCode = await createInvite(otherOwner, secondWorld);
    const [firstCandidate, secondCandidate] = await Promise.all([connect(candidateA), connect(candidateB)]);
    const outcomes = await Promise.allSettled([redeem(firstCandidate, secondCode), redeem(secondCandidate, secondCode)]);
    const successes = outcomes.filter((result) => result.status === 'fulfilled');
    const failures = outcomes.filter((result) => result.status === 'rejected');
    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].reason.message, 'INVITE_USED');
    const members = await admin.query('SELECT role FROM public.world_members WHERE world_id = $1 ORDER BY role', [secondWorld]);
    assert.deepEqual(members.rows.map(({ role }) => role), ['owner', 'partner']);
    console.log('Parallel invite redemption creates exactly one partner');

    // Concurrent retries by two sessions of the same actor receive one receipt.
    const placement = (session) => session.query(
      "SELECT public.place_furniture($1, 'home', 'lamp_floor', 8, 5, 1, $2) AS result",
      [world, 'concurrent-place'],
    );
    const [ownerPid, retryPid] = await Promise.all([backendPid(ownerSession), backendPid(ownerOtherSession)]);
    await ownerSession.query('BEGIN');
    const first = await placement(ownerSession);
    const retryResult = placement(ownerOtherSession).then(
      (result) => ({ result }),
      (error) => ({ error }),
    );
    assert(await waitForBlock(admin, ownerPid, retryPid), 'Retry did not wait for the first mutation');
    await ownerSession.query('COMMIT');
    const { result: retry, error } = await retryResult;
    if (error) throw error;
    assert.deepEqual(first.rows[0].result, retry.rows[0].result);
    const final = await admin.query('SELECT layout_version FROM public.worlds WHERE id = $1', [world]);
    assert.equal(final.rows[0].layout_version, 2);
    console.log('Parallel idempotent retries mutate layout once');
  } finally {
    await Promise.all(clients.filter((client) => client !== admin).map((client) => client.end()));
    if (admin) {
      try {
        await admin.query('DELETE FROM public.worlds WHERE created_by = ANY($1::uuid[])', [actors]);
        await admin.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [actors]);
      } finally {
        await admin.end();
      }
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
