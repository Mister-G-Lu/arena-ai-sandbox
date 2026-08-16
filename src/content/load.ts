import { ZONES } from '../game/progression';
import {
  validateStoryGraph,
  validateStorylet,
  type Storylet,
  type ZoneId,
} from '../game/storylets';

const modules = import.meta.glob('./**/*.json', { eager: true, import: 'default' });

export function loadAllStorylets(): Storylet[] {
  const cards: Storylet[] = [];
  for (const [path, raw] of Object.entries(modules)) {
    try {
      cards.push(validateStorylet(raw));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`${path}: ${msg}`);
    }
  }
  const sorted = cards.sort((a, b) => a.id.localeCompare(b.id));
  const entryPoints = Object.fromEntries(ZONES.map(({ id, entry }) => [id, entry]));
  return validateStoryGraph(sorted, entryPoints);
}

export function cardsInZone(cards: Storylet[], zone: ZoneId): Storylet[] {
  return cards.filter((c) => c.zone === zone);
}

export function findCard(cards: Storylet[], id: string): Storylet | undefined {
  return cards.find((c) => c.id === id);
}
