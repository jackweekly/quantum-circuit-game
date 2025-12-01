import { create } from 'zustand'

export type GameMode = 'campaign' | 'sandbox'

export interface GameState {
  mode: GameMode
  tick: number
  isPaused: boolean
  setMode: (mode: GameMode) => void
  togglePause: () => void
  advanceTick: () => void
}

export const useGameStore = create<GameState>((set) => ({
  mode: 'campaign',
  tick: 0,
  isPaused: false,
  setMode: (mode) => set({ mode }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  advanceTick: () => set((state) => ({ tick: state.tick + 1 })),
}))
