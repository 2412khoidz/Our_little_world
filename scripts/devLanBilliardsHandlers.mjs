// Server-side Dev LAN handlers for Billiards stats & idempotent match persistence

function computeTallies(matches) {
  const counts = new Map();
  for (const m of matches) {
    if (!m.winnerUserId) continue;
    counts.set(m.winnerUserId, (counts.get(m.winnerUserId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([userId, wins]) => ({ userId, wins }));
}

export function handleBilliardsRoute({
  req,
  res,
  route,
  reqUrl,
  body,
  userId,
  db,
  isWorldMember,
  sendJson,
  saveDb,
}) {
  if (req.method === 'GET' && route === '/billiards/stats') {
    const worldId = reqUrl.searchParams.get('worldId') ?? '';
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Bạn chưa là thành viên của ngôi nhà này.',
      });
      return true;
    }
    db.billiardsMatches ??= {};
    const matches = db.billiardsMatches[worldId] ?? [];
    sendJson(res, 200, {
      ok: true,
      data: {
        tallies: computeTallies(matches),
        totalMatches: matches.length,
      },
    });
    return true;
  }

  if (req.method === 'POST' && route === '/billiards/record') {
    const {
      worldId,
      matchId,
      rule,
      rackSeed,
      winnerUserId,
      loserUserId = null,
      reason = '',
      shots = [],
      durationSeconds = 0,
    } = body ?? {};

    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Bạn chưa là thành viên của ngôi nhà này.',
      });
      return true;
    }

    const cleanMatchId = String(matchId ?? '').trim();
    if (
      !cleanMatchId ||
      cleanMatchId.length > 128 ||
      (rule !== '8ball' && rule !== '9ball') ||
      !winnerUserId ||
      !Array.isArray(shots)
    ) {
      sendJson(res, 400, {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu kết quả ván bi-a chưa hợp lệ.',
      });
      return true;
    }

    if (!isWorldMember(worldId, winnerUserId)) {
      sendJson(res, 403, {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Người thắng không thuộc ngôi nhà này.',
      });
      return true;
    }

    if (loserUserId !== null && loserUserId !== undefined) {
      if (loserUserId === winnerUserId) {
        sendJson(res, 400, {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Người thắng và người thua phải khác nhau.',
        });
        return true;
      }
      if (!isWorldMember(worldId, loserUserId)) {
        sendJson(res, 403, {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Người chơi không thuộc ngôi nhà này.',
        });
        return true;
      }
    }

    db.billiardsMatches ??= {};
    const list = (db.billiardsMatches[worldId] ??= []);
    const existing = list.find((m) => m.matchId === cleanMatchId);
    let inserted = false;
    if (!existing) {
      list.push({
        matchId: cleanMatchId,
        worldId,
        rule,
        rackSeed: Number(rackSeed) || 0,
        winnerUserId,
        loserUserId: loserUserId ?? null,
        reason: String(reason ?? '').slice(0, 300),
        shots,
        durationSeconds: Math.max(0, Math.round(Number(durationSeconds) || 0)),
        createdAt: new Date().toISOString(),
      });
      inserted = true;
      saveDb();
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        tallies: computeTallies(list),
        inserted,
      },
    });
    return true;
  }

  return false;
}
