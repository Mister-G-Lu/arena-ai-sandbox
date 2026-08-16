import type { HTMLAttributes, ReactNode } from 'react';

export function HudFrame({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'figure';
} & HTMLAttributes<HTMLElement>) {
  const cls = ['hud', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} {...rest}>
      <span className="hud-br" aria-hidden="true" />
      {children}
    </Tag>
  );
}

export function flickerClass(on: boolean): string {
  return on ? 'fx-flicker' : '';
}
