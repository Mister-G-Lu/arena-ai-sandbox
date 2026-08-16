import { describe, expect, it } from 'vitest';

const componentSources = import.meta.glob('../components/**/*.{js,jsx,ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const storyContent = import.meta.glob('../content/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

describe('content safety contract', () => {
  it('keeps executable HTML sinks out of UI components', () => {
    const forbidden = [
      'dangerouslySetInnerHTML',
      '.innerHTML',
      '.outerHTML',
      'insertAdjacentHTML',
      'eval(',
    ];
    for (const [path, source] of Object.entries(componentSources)) {
      for (const token of forbidden) {
        expect(source, `${path} contains ${token}`).not.toContain(token);
      }
    }
  });

  it('keeps story JSON as plain text rather than HTML-bearing content', () => {
    for (const [path, content] of Object.entries(storyContent)) {
      expect(JSON.stringify(content), `${path} contains an HTML tag`).not.toMatch(/<\/?[a-z][^>]*>/i);
    }
  });
});
