import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HudFrame, flickerClass } from './HudFrame';

describe('HudFrame', () => {
  it('wraps children with HUD corners', () => {
    render(
      <HudFrame className="card">
        <p>inside</p>
      </HudFrame>,
    );
    expect(screen.getByText('inside')).toBeInTheDocument();
    expect(document.querySelector('.hud.card')).toBeTruthy();
    expect(document.querySelector('.hud-br')).toBeTruthy();
  });

  it('can render as a figure', () => {
    const { container } = render(
      <HudFrame as="figure">
        <span>art</span>
      </HudFrame>,
    );
    expect(container.querySelector('figure.hud')).toBeTruthy();
  });
});

describe('flickerClass', () => {
  it('toggles the class name', () => {
    expect(flickerClass(true)).toBe('fx-flicker');
    expect(flickerClass(false)).toBe('');
  });
});
