import { create } from 'zustand'

export type GameMode = 'campaign' | 'sandbox'
export type InteractionMode = 'inspect' | 'build' | 'erase'

export interface GameState {
  mode: GameMode
  tick: number
  isPaused: boolean
  interactionMode: InteractionMode
  selectedBuildId: string | null
  setMode: (mode: GameMode) => void
  setInteractionMode: (mode: InteractionMode) => void
  setSelectedBuildId: (id: string | null) => void
  togglePause: () => void
  advanceTick: () => void
}

export const useGameStore = create<GameState>((set) => ({
  mode: 'campaign',
  tick: 0,
  isPaused: false,
  interactionMode: 'inspect',
  selectedBuildId: null,
  setMode: (mode) => set({ mode }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setSelectedBuildId: (id) =>
    set({
      selectedBuildId: id,
      interactionMode: id ? 'build' : 'inspect',
    }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  advanceTick: () => set((state) => ({ tick: state.tick + 1 })),
}))
