import { worldGrid, type Tile } from './grid'
import { worldItems } from './items'

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
}
