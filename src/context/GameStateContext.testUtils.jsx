import { render } from '@testing-library/react';
import { GameStateProvider, useGameState } from './GameStateContext';

export let api;

function Probe() {
  api = useGameState();
  return null;
}

export function mount() {
  render(
    <GameStateProvider>
      <Probe />
    </GameStateProvider>,
  );
}
