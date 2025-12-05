import { create } from 'zustand'
import { type Direction } from '../engine/grid'

export type GameMode = 'campaign' | 'sandbox'
export type InteractionMode = 'inspect' | 'build' | 'erase'
export type TargetState = 'zero' | 'one' | 'plus'

export interface Contract {
  id: string
  goal: string
  target: TargetState
  required: number
  delivered: number
  rewardPerUnit: number
  completed?: boolean
}

export interface GameState {
  mode: GameMode
  tick: number
  isPaused: boolean
  interactionMode: InteractionMode
  selectedBuildId: string | null
  buildDirection: Direction
  score: number
  goal: string
  credits: number
  contract: Contract | null
  availableBuilds: string[]
  setMode: (mode: GameMode) => void
  setInteractionMode: (mode: InteractionMode) => void
  setSelectedBuildId: (id: string | null) => void
  setBuildDirection: (dir: Direction) => void
  togglePause: () => void
  advanceTick: () => void
  incrementScore: (amount: number) => void
  addCredits: (amount: number) => void
  spendCredits: (amount: number) => boolean
  setContract: (contract: Contract | null) => void
  incrementDelivered: () => void
  setGoalText: (text: string) => void
  setAvailableBuilds: (ids: string[]) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'campaign',
  tick: 0,
  isPaused: false,
  interactionMode: 'inspect',
  selectedBuildId: null,
  buildDirection: 'east',
  score: 0,
  goal: 'Deliver 10 |1> Qubits (Purple)',
  credits: 100,
  contract: null,
  availableBuilds: ['conveyor', 'h', 'x', 'z', 'cnot'],
  setMode: (mode) => set({ mode }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setSelectedBuildId: (id) =>
    set({
      selectedBuildId: id,
      interactionMode: id ? 'build' : 'inspect',
    }),
  setBuildDirection: (dir) => set({ buildDirection: dir }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  advanceTick: () => set((state) => ({ tick: state.tick + 1 })),
  incrementScore: (amount) => set((state) => ({ score: state.score + amount })),
  addCredits: (amount) => set((state) => ({ credits: state.credits + amount })),
  spendCredits: (amount) => {
    const { credits } = get()
    if (credits < amount) return false
    set({ credits: credits - amount })
    return true
  },
  setContract: (contract) => set({ contract }),
  incrementDelivered: () =>
    set((state) => {
      if (!state.contract) return state
      const delivered = state.contract.delivered + 1
      const completed = delivered >= state.contract.required
      return { contract: { ...state.contract, delivered, completed } }
    }),
  setGoalText: (text) => set({ goal: text }),
  setAvailableBuilds: (ids) => set({ availableBuilds: ids }),
}))
