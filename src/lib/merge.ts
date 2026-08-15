import { accrue, type ActionState } from '../game/actions';
import { type ShiftState } from '../game/shift';
import { ZONE_IDS, type Progress, type ZoneId, type ZoneStatus } from '../game/storylets';
import { makeEnvelope, type SaveEnvelope } from './saveFile';

const ZONE_RANK: Record<ZoneStatus, number> = { locked: 0, open: 1, complete: 2 };

export function mergeQualities(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = Math.max(out[k] ?? 0, v);
  }
  return out;
}

export function mergeZones(
  a: Progress['zones'],
  b: Progress['zones'],
): Progress['zones'] {
  const out = { ...a };
  for (const z of ZONE_IDS) {
    out[z] = ZONE_RANK[a[z]] >= ZONE_RANK[b[z]] ? a[z] : b[z];
  }
  return out;
}

export function mergeShift(a: ShiftState, b: ShiftState): ShiftState {
  if (a.day !== b.day) return a.day > b.day ? a : b;
  return a.tasks <= b.tasks ? a : b;
}

export function mergeActions(a: ActionState, b: ActionState, now: number): ActionState {
  const left = accrue(a, now);
  const right = accrue(b, now);
  const current = Math.max(left.current, right.current);
  const cap = left.cap;
  const lastTick = current >= cap ? now : Math.max(left.lastTick, right.lastTick);
  return { ...left, current, lastTick };
}

export function mergeCurrent(
  a: Progress['current'],
  b: Progress['current'],
): Progress['current'] {
  if (!a) return b;
  if (!b) return a;
  return a;
}

export function mergeEnvelopes(local: SaveEnvelope, cloud: SaveEnvelope, now: number): SaveEnvelope {
  return makeEnvelope(
    {
      progress: {
        qualities: mergeQualities(local.progress.qualities, cloud.progress.qualities),
        zones: mergeZones(local.progress.zones, cloud.progress.zones),
        seen: [...new Set([...local.progress.seen, ...cloud.progress.seen])],
        current: mergeCurrent(local.progress.current, cloud.progress.current),
      },
      shift: mergeShift(local.shift, cloud.shift),
      actions: mergeActions(local.actions, cloud.actions, now),
    },
    new Date(now),
  );
}

export function envelopesDiffer(a: SaveEnvelope, b: SaveEnvelope): boolean {
  const strip = (e: SaveEnvelope) => ({
    progress: e.progress,
    shift: { ...e.shift, log: e.shift.log.map((l) => ({ ...l, id: '' })) },
    actions: { current: e.actions.current, cap: e.actions.cap },
  });
  return JSON.stringify(strip(a)) !== JSON.stringify(strip(b));
}

export function fileView(env: SaveEnvelope): {
  exportedAt: string;
  day: number;
  tasks: number;
  actions: number;
  qualities: [string, number][];
  zones: { id: ZoneId; status: ZoneStatus }[];
} {
  const hidden = new Set(['Attention']);
  return {
    exportedAt: env.exportedAt,
    day: env.shift.day,
    tasks: env.shift.tasks,
    actions: env.actions.current,
    qualities: Object.entries(env.progress.qualities).filter(([k]) => !hidden.has(k)),
    zones: ZONE_IDS.map((id) => ({ id, status: env.progress.zones[id] })),
  };
}
