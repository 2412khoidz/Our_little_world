export type StudyMode = 'solo' | 'shared';
export type StudySessionPhase = 'focus' | 'break' | 'completed';
export type StudySessionStatus = 'running' | 'paused' | 'completed';
export type StudyControlAction = 'pause' | 'resume' | 'finish';

export interface StudySession {
  id: string;
  worldId: string;
  ownerId: string;
  mode: StudyMode;
  phase: StudySessionPhase;
  status: StudySessionStatus;
  focusMinutes: number;
  breakMinutes: number;
  startedAtMs: number;
  endsAtMs: number;
  remainingMs: number;
  version: number;
  updatedAt: string;
}

export interface DerivedStudyView {
  phase: StudySessionPhase;
  status: StudySessionStatus;
  startedAtMs: number;
  endsAtMs: number;
  remainingMs: number;
  totalDurationMs: number;
  progressPercent: number;
}

export interface StudySnapshot {
  worldId: string;
  serverNowMs: number;
  sharedSession: StudySession | null;
  soloSession: StudySession | null;
}

export const STUDY_PRESETS = [
  { id: '25-5', label: '25p · Nghỉ 5p', focusMinutes: 25, breakMinutes: 5 },
  { id: '45-10', label: '45p · Nghỉ 10p', focusMinutes: 45, breakMinutes: 10 },
  { id: '60-10', label: '60p · Nghỉ 10p', focusMinutes: 60, breakMinutes: 10 },
  { id: '90-15', label: '90p · Nghỉ 15p', focusMinutes: 90, breakMinutes: 15 },
] as const;
