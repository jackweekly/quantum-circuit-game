import { worldGrid, type Direction } from './grid'
import { worldItems } from './items'

const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
}

export function updateSimulation(dt: number) {
  worldItems.update(dt, (x, y) => {
    const tile = worldGrid.get(x, y)
    if (tile && tile.kind === 'conveyor' && tile.direction) {
      return DIR_VECTORS[tile.direction]
    }
    if (tile && tile.kind === 'printer' && tile.direction) {
      return DIR_VECTORS[tile.direction]
    }
    return null
  })
}
