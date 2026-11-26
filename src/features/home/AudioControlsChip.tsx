import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { gameAudio, type GameAudioSettings } from '../../game/audio/gameAudioManager';

export function AudioControlsChip() {
  const [settings, setSettings] = useState<GameAudioSettings>(() => gameAudio.getSettings());
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => gameAudio.subscribe(setSettings), []);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [open]);

  const effectiveMuted = settings.muted || settings.masterVolume <= 0.01;

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        className="pill"
        data-testid="btn-audio-controls"
        title="Âm lượng nhạc nền & hiệu ứng"
        aria-label="Âm lượng nhạc nền & hiệu ứng"
        aria-expanded={open}
        onClick={() => {
          void gameAudio.unlock();
          setOpen((v) => !v);
        }}
        style={{ cursor: 'pointer', gap: 5 }}
      >
        {effectiveMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        <span>{effectiveMuted ? 'Tắt tiếng' : `${Math.round(settings.masterVolume * 100)}%`}</span>
      </button>

      {open ? (
        <div
          data-testid="audio-controls-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 224,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(34, 24, 30, 0.96)',
            border: '1px solid rgba(255, 224, 178, 0.28)',
            boxShadow: '0 10px 26px rgba(0, 0, 0, 0.45)',
            color: '#fff8ef',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ fontSize: 12 }}>Âm thanh</strong>
            <button
              type="button"
              className="pill"
              onClick={() => {
                void gameAudio.unlock();
                gameAudio.setSettings({ muted: !settings.muted });
              }}
              style={{ cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}
            >
              {settings.muted ? 'Bật tiếng' : 'Tắt tiếng'}
            </button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
              <span>Tổng</span>
              <span>{Math.round(settings.masterVolume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.masterVolume * 100)}
              onChange={(e) => {
                void gameAudio.unlock();
                gameAudio.setSettings({ masterVolume: Number(e.target.value) / 100, muted: false });
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
              <span>Nhạc nền</span>
              <span>{Math.round(settings.musicVolume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(e) => {
                void gameAudio.unlock();
                gameAudio.setSettings({ musicVolume: Number(e.target.value) / 100 });
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
              <span>Hiệu ứng (SFX)</span>
              <span>{Math.round(settings.sfxVolume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => {
                void gameAudio.unlock();
                gameAudio.setSettings({ sfxVolume: Number(e.target.value) / 100 });
                gameAudio.playSfx('ui_select', { volumeScale: 0.8 });
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
