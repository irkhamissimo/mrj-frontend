import {  clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Compute elapsed active seconds for a session. When paused, the elapsed
// time is frozen at pauseStartTime because totalPauseDuration has not yet
// absorbed the current pause.
export function computeElapsedSeconds(session) {
  if (!session || !session.startTime) return 0;
  const startMs = new Date(session.startTime).getTime();
  const endMs =
    session.isPaused && session.pauseStartTime
      ? new Date(session.pauseStartTime).getTime()
      : Date.now();
  const pauseMs = (session.totalPauseDuration || 0) * 60 * 1000;
  return Math.floor((endMs - startMs - pauseMs) / 1000);
} 