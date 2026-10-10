import { IEventSession } from '@/models/EventSession';

export interface TimerStatus {
  isActive: boolean;
  isExpired: boolean;
  remainingSeconds: number;
  serverTimestamp: number;
  expiresAt: string | null;
}

/**
 * Validates session expiry strictly based on the server's current timestamp.
 */
export function evaluateSessionTimer(session: IEventSession | null): TimerStatus {
  const now = Date.now();

  if (
    !session ||
    !session.expiresAt ||
    session.status === 'not_started' ||
    session.status === 'not_attended'
  ) {
    return {
      isActive: false,
      isExpired: false,
      remainingSeconds: 0,
      serverTimestamp: now,
      expiresAt: null,
    };
  }

  const expiresAtMs = new Date(session.expiresAt).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
  const isExpired = session.status === 'expired' || remainingSeconds <= 0;

  return {
    isActive: session.status === 'active' && !isExpired,
    isExpired,
    remainingSeconds,
    serverTimestamp: now,
    expiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * Format seconds to MM:SS or HH:MM:SS display string
 */
export function formatTimeDisplay(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
