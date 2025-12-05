import { worldGrid, type Tile } from './grid'
import { worldItems } from './items'
import { useGameStore } from '../state/useGameStore'

export interface LevelTile {
  x: number
  y: number
  kind: Tile['kind']
  direction?: Tile['direction']
  gateId?: string
}

export interface LevelData {
  layout?: LevelTile[]
  goal?: string
  contract?: {
    id: string
    goal: string
    target: 'zero' | 'one' | 'plus'
    required: number
    rewardPerUnit: number
  }
  availableBuilds?: string[]
}

export function loadLevel(level: LevelData) {
  worldGrid.clear()
  worldItems.destroyAll()
  level.layout?.forEach((t) => {
    worldGrid.set(t.x, t.y, {
      kind: t.kind,
      direction: t.direction,
      gateId: t.gateId,
      locked: t.kind === 'source' || t.kind === 'sink',
    })
  })
  const store = useGameStore.getState()
  if (level.goal) {
    store.setGoalText(level.goal)
  }
  if (level.contract) {
    store.setContract({
      id: level.contract.id,
      goal: level.contract.goal,
      target: level.contract.target,
      required: level.contract.required,
      delivered: 0,
      rewardPerUnit: level.contract.rewardPerUnit,
      completed: false,
    })
  }
  if (level.availableBuilds) {
    store.setAvailableBuilds(level.availableBuilds)
  }
}
