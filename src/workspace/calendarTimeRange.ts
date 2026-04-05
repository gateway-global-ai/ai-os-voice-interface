/**
 * Grounded time windows for calendar event list (POL-INTENT-004 / SPEC-009 temporal scope).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type CalendarPeriodPreset = 'today' | '7d' | '30d';

/** RFC3339 `time_min` / `time_max` for Google Calendar `events.list`. */
export function computeCalendarPeriodRange(preset: CalendarPeriodPreset): { time_min: string; time_max: string } {
  const now = new Date();
  if (preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { time_min: start.toISOString(), time_max: end.toISOString() };
  }
  if (preset === '7d') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { time_min: start.toISOString(), time_max: end.toISOString() };
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  end.setHours(23, 59, 59, 999);
  return { time_min: start.toISOString(), time_max: end.toISOString() };
}
