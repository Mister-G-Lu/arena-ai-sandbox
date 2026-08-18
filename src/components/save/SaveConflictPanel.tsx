import type { ReactNode } from 'react';

interface SaveConflictPanelProps {
  /** Primary alert text (the bolded lead-in). */
  message: string;
  /** Optional summary rows rendered inside `.save-summary-grid`. */
  summaries?: ReactNode;
  /** Optional action buttons rendered inside `.save-action-row`. */
  actions?: ReactNode;
  /** Extra classes, e.g. `save-reset-confirmation`. */
  className?: string;
}

/** The shared wrapper for every "which file wins?" prompt on the save page —
 * local-vs-other-tab, local-vs-Records, import, and reset confirmations all
 * use the same alert shell, differing only in message, summaries, and buttons. */
export default function SaveConflictPanel({
  message,
  summaries,
  actions,
  className,
}: SaveConflictPanelProps) {
  return (
    <div className={`save-conflict${className ? ` ${className}` : ''}`} role="alert">
      <p><strong>{message}</strong></p>
      {summaries && <div className="save-summary-grid">{summaries}</div>}
      {actions && <div className="save-action-row">{actions}</div>}
    </div>
  );
}
