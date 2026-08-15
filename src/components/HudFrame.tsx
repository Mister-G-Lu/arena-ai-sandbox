import type { ReactNode } from 'react';

export function HudFrame({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'figure';
}) {
  const cls = ['hud', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls}>
      <span className="hud-br" aria-hidden="true" />
      {children}
    </Tag>
  );
}

export function flickerClass(on: boolean): string {
  return on ? 'fx-flicker' : '';
}
