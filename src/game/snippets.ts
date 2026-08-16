export const ROUTINE_SNIPPETS = [
  'Roll call — VANTABLACK, Sector 9: roads quiet, stars out, all clear.',
  'Ticket filed — streetlight 4-B, Building 4. Crew already en route. Everyone’s friendly tonight.',
  'Break room — coffee fresh. As always. You didn’t even have to brew it.',
  'Weather desk — clear skies until 06:00. Not a cloud in the world.',
  'Route check — all trucks on schedule. On-time performance: 100.0%.',
  'Radio check — night crew confirmed. The city is in good hands.',
  'Inventory — pens counted: 41,312. A nice, even number.',
  'Memo board — nothing new. The day crew sends their regards.',
  'Window check — streetlights all on. The city glows like it’s glad you’re here.',
  'Attendance log — you: present. As always.',
  'Population chart — 41,312, holding steady. Everyone accounted for.',
  'Roof report — antennas clear. Reception: perfect.',
] as const;

export const SHIFT_START_LINE = 'Tuesday. The coffee is already warm.';
export const SHIFT_COMPLETE_LINE =
  'SHIFT COMPLETE. The city thanks you. See you tomorrow, Operator.';

export const MAX_TASKS = 50;
export const SHIFT_START_MINUTES = 60; // 01:00
export const SHIFT_END_MINUTES = 360; // 06:00
export const MINUTES_PER_TASK = 6;
export const DEFAULT_DAY = 4;
