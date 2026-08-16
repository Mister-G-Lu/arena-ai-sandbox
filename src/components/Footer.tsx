import { flickerClass } from './HudFrame';

export const DEFAULT_HINT = 'this page was rendered for your convenience.';

export function Footer({
  flicker,
  hintOverride,
}: {
  flicker: boolean;
  hintOverride: string | null;
}) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>© 2026 Meridian Municipal Authority. All rights reserved.</p>
        <p className="footer-sub">
          FALSE REALITY · build 0.41.312 ·{' '}
          <span id="hint" className={flickerClass(flicker)}>
            {hintOverride ?? DEFAULT_HINT}
          </span>
        </p>
      </div>
    </footer>
  );
}
