import { useEffect, useState } from 'react';
import { BookOpen, Pause, Play, Square, Volume2, VolumeX, X } from 'lucide-react';
import { deriveStudySessionAt, formatDurationMmSs } from '../../shared/study/pomodoro';
import {
  STUDY_PRESETS,
  type StudyControlAction,
  type StudyMode,
  type StudySnapshot,
} from '../../shared/study/studyTypes';
import type { WorldMember } from '../../shared/types';
import type { AmbientTrack } from './ambientAudio';

interface PomodoroPanelProps {
  snapshot: StudySnapshot | null;
  localUserId: string;
  members: WorldMember[];
  busy: boolean;
  ambientTrack: AmbientTrack;
  selectedSeat: 'left' | 'right';
  onSelectSeat: (seat: 'left' | 'right') => void;
  onChangeAmbient: (track: AmbientTrack) => void;
  onStartSession: (mode: StudyMode, focusMinutes: number, breakMinutes: number) => Promise<void>;
  onControlSession: (sessionId: string, action: StudyControlAction, version: number) => Promise<void>;
  onClose: () => void;
}

export function PomodoroPanel({
  snapshot,
  localUserId,
  members,
  busy,
  ambientTrack,
  selectedSeat,
  onSelectSeat,
  onChangeAmbient,
  onStartSession,
  onControlSession,
  onClose,
}: PomodoroPanelProps) {
  const [modeTab, setModeTab] = useState<StudyMode>('shared');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const serverNowMs = (snapshot?.serverNowMs ?? 0) + tick * 1000;
  const activeSession = modeTab === 'shared' ? snapshot?.sharedSession ?? null : snapshot?.soloSession ?? null;
  const derived = activeSession ? deriveStudySessionAt(activeSession, serverNowMs) : null;
  const isOwner = activeSession ? activeSession.ownerId === localUserId : false;
  const ownerNickname = activeSession
    ? members.find((m) => m.userId === activeSession.ownerId)?.nickname ?? 'Thành viên'
    : null;
  const preset = STUDY_PRESETS[selectedPresetIdx] ?? STUDY_PRESETS[0];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Phòng học yên tĩnh">
      <div className="modal-panel" data-testid="study-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <BookOpen size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Phòng học yên tĩnh (0 camera)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn--sm ${modeTab === 'shared' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            data-testid="tab-study-shared"
            onClick={() => setModeTab('shared')}
          >
            Học cùng nhau
          </button>
          <button
            type="button"
            className={`btn btn--sm ${modeTab === 'solo' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            data-testid="tab-study-solo"
            onClick={() => setModeTab('solo')}
          >
            Góc riêng của mình
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 12,
            background: 'var(--surface-warm)',
            border: '1px solid var(--border-honey)',
            fontSize: 12.5,
          }}
        >
          <span>Chỗ ngồi tại bàn học:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn btn--sm ${selectedSeat === 'left' ? 'btn--primary' : 'btn--secondary'}`}
              data-testid="btn-study-seat-left"
              onClick={() => onSelectSeat('left')}
            >
              Ghế trái
            </button>
            <button
              type="button"
              className={`btn btn--sm ${selectedSeat === 'right' ? 'btn--primary' : 'btn--secondary'}`}
              data-testid="btn-study-seat-right"
              onClick={() => onSelectSeat('right')}
            >
              Ghế phải
            </button>
          </div>
        </div>

        {activeSession && derived && derived.status !== 'completed' ? (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'var(--surface-warm)',
              border: '1px solid var(--border-honey)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-muted)' }}>
              {derived.phase === 'focus' ? 'Đang tập trung êm ái' : 'Giờ nghỉ mắt & uống nước'}
              {modeTab === 'shared' && ownerNickname ? ` · Mở bởi ${ownerNickname}` : ''}
            </div>
            <div
              data-testid="study-countdown"
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDurationMmSs(derived.remainingMs)}
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: 'rgba(107, 75, 62, 0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${derived.progressPercent}%`,
                  height: '100%',
                  background: derived.phase === 'break' ? '#76a880' : '#d97762',
                  transition: 'width 300ms linear',
                }}
              />
            </div>

            {isOwner ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                {derived.status === 'running' ? (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={busy}
                    data-testid="btn-study-pause"
                    onClick={() => void onControlSession(activeSession.id, 'pause', activeSession.version)}
                  >
                    <Pause size={14} /> Tạm dừng
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={busy}
                    data-testid="btn-study-resume"
                    onClick={() => void onControlSession(activeSession.id, 'resume', activeSession.version)}
                  >
                    <Play size={14} /> Tiếp tục
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  disabled={busy}
                  data-testid="btn-study-finish"
                  onClick={() => void onControlSession(activeSession.id, 'finish', activeSession.version)}
                >
                  <Square size={14} /> Kết thúc
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                Bạn đang học đồng bộ cùng {ownerNickname}. Đồng hồ tự giữ chuẩn giờ ngay cả khi khóa màn hình.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Chọn nhịp tập trung:</div>
            <div className="chip-grid">
              {STUDY_PRESETS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`chip ${selectedPresetIdx === idx ? 'chip--selected' : ''}`}
                  data-testid={`study-preset-${p.id}`}
                  onClick={() => setSelectedPresetIdx(idx)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              data-testid="btn-study-start"
              onClick={() =>
                void onStartSession(modeTab, preset.focusMinutes, preset.breakMinutes)
              }
            >
              <Play size={15} /> Bắt đầu phiên {modeTab === 'shared' ? 'học chung' : 'cá nhân'}
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            paddingTop: 6,
            borderTop: '1px solid rgba(107, 75, 62, 0.14)',
            fontSize: 12.5,
          }}
        >
          <span>
            {ambientTrack === 'none' ? <VolumeX size={14} /> : <Volume2 size={14} />}{' '}
            Âm thanh phòng học:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(
              [
                ['none', 'Tắt'],
                ['rain', 'Mưa nhẹ'],
                ['hearth', 'Lò sưởi'],
              ] as const
            ).map(([track, label]) => (
              <button
                key={track}
                type="button"
                className={`btn btn--sm ${ambientTrack === track ? 'btn--primary' : 'btn--secondary'}`}
                data-testid={`btn-study-ambient-${track}`}
                aria-pressed={ambientTrack === track}
                onClick={() => onChangeAmbient(track)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {ambientTrack === 'none' && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'right' }}>
            Đang tắt tiếng &amp; tạm lắng nhạc nền để giữ phòng học yên tĩnh.
          </div>
        )}
      </div>
    </div>
  );
}
