import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Home, KeyRound, LogOut, RotateCcw, Sparkles, UserPlus } from 'lucide-react';
import type { AuthSessionUser, LocalPresetAccountId, WorldBackend } from '../../lib/backend/types';
import { renderAvatarPreviewCanvas } from '../../game/art/avatarSpriteBuilder';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../shared/avatar';
import type { AvatarConfig, DevIdentityInfo, WorldSnapshot } from '../../shared/types';

interface OnboardingScreenProps {
  backend: WorldBackend;
  currentUser: AuthSessionUser | null;
  isRemoteClient?: boolean;
  onEnterWorld: (snapshot: WorldSnapshot) => void;
}

export function OnboardingScreen({
  backend,
  currentUser,
  isRemoteClient = false,
  onEnterWorld,
}: OnboardingScreenProps) {
  const showDevTools = import.meta.env.DEV && backend.mode === 'dev-lan';
  const isUnconfigured = backend.mode === 'unconfigured';

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pairMode, setPairMode] = useState<'create' | 'join'>(() =>
    isRemoteClient ||
    currentUser?.userId === '22222222-2222-4222-8222-222222222222' ||
    currentUser?.userId === '33333333-3333-4333-8333-333333333333'
      ? 'join'
      : 'create',
  );
  const [worldName, setWorldName] = useState('Ngôi nhà nhỏ của hai đứa');
  const [nickname, setNickname] = useState(() => {
    if (currentUser?.userId === '22222222-2222-4222-8222-222222222222') return 'Nắng';
    if (currentUser?.userId === '33333333-3333-4333-8333-333333333333') return 'Khách lạ';
    return currentUser?.displayLabel.split(' ')[0] || 'Mây';
  });
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [devRoster, setDevRoster] = useState<{
    identities: DevIdentityInfo[];
    worldExists: boolean;
    worldName: string | null;
    memberCount: number;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewAvatar: AvatarConfig =
    pairMode === 'join' ? DEFAULT_AVATAR_PARTNER_B : DEFAULT_AVATAR_PARTNER_A;

  const refreshDevRoster = useCallback(async () => {
    if (!import.meta.env.DEV || !backend.listDevIdentities) return;
    const roster = await backend.listDevIdentities();
    setDevRoster(roster);
  }, [backend]);

  useEffect(() => {
    if (!import.meta.env.DEV || backend.mode !== 'dev-lan' || !backend.listDevIdentities) return;
    let active = true;
    void backend.listDevIdentities().then((roster) => {
      if (active) setDevRoster(roster);
    });
    return () => {
      active = false;
    };
  }, [backend, currentUser]);

  useEffect(() => {
    if (previewCanvasRef.current) {
      renderAvatarPreviewCanvas(previewCanvasRef.current, previewAvatar, 4);
    }
  }, [previewAvatar]);

  async function handleDevPreset(preset: LocalPresetAccountId, defaultNickname: string) {
    if (!import.meta.env.DEV) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    const res = await backend.signInLocalPreset?.(preset);
    setBusy(false);
    if (res && !res.ok) {
      setErrorMsg(res.message);
      return;
    }
    setNickname(defaultNickname);
    setPairMode(preset === 'partner-a' ? 'create' : 'join');
  }

  async function handleDevSeedCouple() {
    if (!import.meta.env.DEV || !backend.seedDevCoupleWorld) return;
    setBusy(true);
    setErrorMsg(null);
    const res = await backend.seedDevCoupleWorld();
    if (!res.ok) {
      setBusy(false);
      setErrorMsg(res.message);
      return;
    }
    await refreshDevRoster();
    setBusy(false);
    setInfoMsg('Đã tạo sẵn ngôi nhà 2/2 (Mây & Nắng). Hãy chọn vai để vào nhà.');
  }

  async function handleDevReset() {
    if (!import.meta.env.DEV || !backend.resetDevWorld) return;
    setBusy(true);
    setErrorMsg(null);
    const res = await backend.resetDevWorld();
    if (res.ok) {
      await backend.signOut();
      await refreshDevRoster();
      setInfoMsg('Đã đặt lại dữ liệu thử nghiệm LAN về trạng thái trống.');
    } else {
      setErrorMsg(res.message);
    }
    setBusy(false);
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);

    if (authMode === 'login') {
      const res = await backend.signInWithPassword(email, password);
      setBusy(false);
      if (!res.ok) setErrorMsg(res.message);
      return;
    }

    const res = await backend.signUpWithPassword(email, password);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    if (res.data.needsEmailVerification) {
      setInfoMsg('Đã gửi email xác nhận. Bạn mở hộp thư bấm xác nhận rồi đăng nhập lại nhé.');
    }
  }

  async function handleCreateWorld(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    const res = await backend.createWorld(worldName, nickname, DEFAULT_AVATAR_PARTNER_A);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    onEnterWorld(res.data);
  }

  async function handleRedeemInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    const res = await backend.redeemInvite(inviteCode, nickname, DEFAULT_AVATAR_PARTNER_B);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    onEnterWorld(res.data);
  }

  return (
    <main className="onboarding-page">
      <section className="cozy-card" aria-label="Bắt đầu Our Little World">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/icons/pwa-192x192.png"
            alt="Biểu tượng Our Little World"
            width={52}
            height={52}
            style={{ borderRadius: 12, imageRendering: 'pixelated' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>Our Little World</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>
              Ngôi nhà nhỏ bình yên dành riêng cho hai người
            </p>
          </div>
        </div>

        {showDevTools && !isRemoteClient && (
          <div className="cozy-alert" data-testid="dev-lan-banner">
            <strong>Môi trường phát triển LAN (Chỉ có khi DEV):</strong> Dữ liệu đồng bộ trực
            tiếp giữa các thiết bị cùng Wi-Fi qua máy tính chủ.
            {devRoster?.worldExists && (
              <div style={{ marginTop: 4 }}>
                Nhà hiện tại: <strong>{devRoster.worldName}</strong> ({devRoster.memberCount}/2
                thành viên)
              </div>
            )}
          </div>
        )}

        {isUnconfigured && (
          <div className="cozy-alert cozy-alert--error">
            Ứng dụng đang chờ kết nối máy chủ. Chủ nhà vui lòng kiểm tra lại cấu hình trước khi chia
            sẻ đường link.
          </div>
        )}

        {errorMsg && (
          <div className="cozy-alert cozy-alert--error" role="alert" data-testid="onboarding-error">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="cozy-alert cozy-alert--success" role="status">
            {infoMsg}
          </div>
        )}

        {!isUnconfigured && !currentUser && (
          <>
            {showDevTools && devRoster && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                data-testid="dev-identity-picker"
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {isRemoteClient
                    ? 'Vào ngôi nhà của hai bạn:'
                    : 'Chọn danh tính kiểm thử (Laptop & Điện thoại):'}
                </span>

                {devRoster.identities
                  .filter((id) => !isRemoteClient || id.presetId === 'partner-b')
                  .map((id) => {
                    const Icon =
                      id.presetId === 'partner-a'
                        ? Home
                        : id.presetId === 'partner-b'
                          ? UserPlus
                          : KeyRound;
                    const btnClass =
                      id.presetId === 'partner-a'
                        ? 'btn btn--primary'
                        : id.presetId === 'partner-b'
                          ? 'btn btn--sage'
                          : 'btn btn--secondary';
                    const statusText = id.inWorld
                      ? ' • Đã trong nhà'
                      : devRoster.memberCount >= 2
                        ? ' • Bị từ chối (Nhà 2/2)'
                        : '';
                    return (
                      <button
                        key={id.presetId}
                        type="button"
                        className={btnClass}
                        disabled={busy}
                        data-testid={`preset-${id.presetId}`}
                        onClick={() => void handleDevPreset(id.presetId, id.nickname)}
                      >
                        <Icon size={18} />
                        {isRemoteClient
                          ? `Vào nhà với vai ${id.nickname}${statusText}`
                          : `${id.nickname} (${id.roleLabel}${statusText})`}
                      </button>
                    );
                  })}

                {!isRemoteClient && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {!devRoster.worldExists && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={busy}
                        data-testid="btn-dev-seed-couple"
                        onClick={() => void handleDevSeedCouple()}
                      >
                        <Sparkles size={15} /> Tạo sẵn nhà 2/2 (Mây &amp; Nắng)
                      </button>
                    )}
                    {devRoster.worldExists && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={busy}
                        data-testid="btn-dev-reset"
                        onClick={() => void handleDevReset()}
                      >
                        <RotateCcw size={15} /> Đặt lại dữ liệu Dev
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showDevTools && (
              <form
                onSubmit={(e) => void handleAuthSubmit(e)}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={`chip ${authMode === 'login' ? 'chip--selected' : ''}`}
                    onClick={() => setAuthMode('login')}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    className={`chip ${authMode === 'signup' ? 'chip--selected' : ''}`}
                    onClick={() => setAuthMode('signup')}
                  >
                    Tạo tài khoản mới
                  </button>
                </div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Email
                  <input
                    className="input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@example.com"
                  />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Mật khẩu
                  <input
                    className="input"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </label>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {authMode === 'login' ? 'Vào nhà ngay' : 'Đăng ký tài khoản'}
                </button>
              </form>
            )}
          </>
        )}

        {!isUnconfigured && currentUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 12,
                background: 'var(--surface-warm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <canvas
                  ref={previewCanvasRef}
                  style={{ width: 40, height: 60, imageRendering: 'pixelated' }}
                />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{currentUser.displayLabel}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{currentUser.email}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => void backend.signOut()}
              >
                <LogOut size={15} /> Đổi tài khoản
              </button>
            </div>

            {!isRemoteClient && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`chip ${pairMode === 'create' ? 'chip--selected' : ''}`}
                  data-testid="tab-create-world"
                  onClick={() => setPairMode('create')}
                >
                  <Sparkles size={15} /> Tạo ngôi nhà mới
                </button>
                <button
                  type="button"
                  className={`chip ${pairMode === 'join' ? 'chip--selected' : ''}`}
                  data-testid="tab-join-world"
                  onClick={() => setPairMode('join')}
                >
                  <Copy size={15} /> Nhập mã mời ghép đôi
                </button>
              </div>
            )}

            {pairMode === 'create' && !isRemoteClient ? (
              <form
                onSubmit={(e) => void handleCreateWorld(e)}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Tên ngôi nhà chung
                  <input
                    className="input"
                    required
                    maxLength={48}
                    value={worldName}
                    onChange={(e) => setWorldName(e.target.value)}
                  />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Biệt danh của bạn
                  <input
                    className="input"
                    required
                    maxLength={32}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={busy}
                  data-testid="btn-create-world"
                >
                  Tạo nhà &amp; Bắt đầu
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => void handleRedeemInvite(e)}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Mã mời từ người thương
                  <input
                    className="input"
                    required
                    data-testid="input-invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Ví dụ: OLW-A1B2C3"
                  />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Biệt danh của bạn
                  <input
                    className="input"
                    required
                    maxLength={32}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn--sage"
                  disabled={busy}
                  data-testid="btn-redeem-invite"
                >
                  Tham gia ngôi nhà
                </button>
              </form>
            )}

            {showDevTools && !isRemoteClient && devRoster?.worldExists && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busy}
                data-testid="btn-dev-reset"
                onClick={() => void handleDevReset()}
              >
                <RotateCcw size={15} /> Đặt lại dữ liệu Dev để thử từ đầu
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
