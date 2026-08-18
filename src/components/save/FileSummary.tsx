export interface FileSummaryGame {
  day: number;
  tasksCompleted: number;
  promotion: { tier: number };
}

interface FileSummaryProps {
  label: string;
  game: FileSummaryGame;
  savedAt: string | null;
}

/** One row describing a candidate operator file in a conflict prompt. */
export default function FileSummary({ label, game, savedAt }: FileSummaryProps) {
  return (
    <div className="save-summary">
      <strong>{label}</strong>
      <span>
        Day {game.day} · {game.tasksCompleted.toLocaleString()} results filed · Tier {game.promotion.tier}
      </span>
      {savedAt && <span>Saved {new Date(savedAt).toLocaleString()}</span>}
    </div>
  );
}
