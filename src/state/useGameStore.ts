import { create } from 'zustand'

export type GameMode = 'campaign' | 'sandbox'
export type InteractionMode = 'inspect' | 'build' | 'erase'

export interface GameState {
  mode: GameMode
  tick: number
  isPaused: boolean
  interactionMode: InteractionMode
  selectedBuildId: string | null
  score: number
  goal: string
  setMode: (mode: GameMode) => void
  setInteractionMode: (mode: InteractionMode) => void
  setSelectedBuildId: (id: string | null) => void
  togglePause: () => void
  advanceTick: () => void
  incrementScore: (amount: number) => void
}

export const useGameStore = create<GameState>((set) => ({
  mode: 'campaign',
  tick: 0,
  isPaused: false,
  interactionMode: 'inspect',
  selectedBuildId: null,
  score: 0,
  goal: 'Deliver 10 |1> Qubits (Purple)',
  setMode: (mode) => set({ mode }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setSelectedBuildId: (id) =>
    set({
      selectedBuildId: id,
      interactionMode: id ? 'build' : 'inspect',
    }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  advanceTick: () => set((state) => ({ tick: state.tick + 1 })),
  incrementScore: (amount) => set((state) => ({ score: state.score + amount })),
}))
