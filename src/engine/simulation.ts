import { worldGrid, type Direction } from './grid'
import { worldItems } from './items'
import { getGate } from '../content/registry'
import { useGameStore } from '../state/useGameStore'

const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
}

const processedLog = new Map<string, true>()
let spawnTimer = 0
const SPAWN_RATE = 4000

function findExitDirection(x: number, y: number, tileDir?: Direction): Direction | undefined {
  if (tileDir) return tileDir
  // Prefer a conveyor in front of the gate: look at right, left, up, down for a belt pointing away
  const directions: Direction[] = ['east', 'west', 'north', 'south']
  for (const dir of directions) {
    const vec = DIR_VECTORS[dir]
    const neighbor = worldGrid.get(x + vec.dx, y + vec.dy)
    if (neighbor && neighbor.kind === 'conveyor') {
      return dir
    }
  }
  return undefined
}

export function updateSimulation(dt: number) {
  spawnTimer += dt
  if (spawnTimer >= SPAWN_RATE) {
    spawnTimer = 0
    worldGrid.forEach(({ x, y }, tile) => {
      if (tile.kind === 'source') {
        worldItems.spawn(x, y)
      }
    })
  }

  worldItems.update(dt, (item, x, y) => {
    const tile = worldGrid.get(x, y)

    if (tile && tile.kind === 'printer' && tile.gateId) {
      const key = `${item.id}:${x},${y}`
      const dist = Math.hypot(item.x + 0.5 - (x + 0.5), item.y + 0.5 - (y + 0.5))
      if (dist < 0.2 && !processedLog.has(key)) {
        const gateDef = getGate(tile.gateId)
        if (gateDef && gateDef.behavior.type === 'unitary') {
          const system = worldItems.systems.get(item.systemId)
          if (system) {
            system.applyGate(gateDef.behavior.matrix, item.qubitIndex)
          }
        }
        processedLog.set(key, true)
        if (processedLog.size > 1000) processedLog.clear()
      }
    }

    if (tile && tile.kind === 'sink') {
      const system = worldItems.systems.get(item.systemId)
      const prob1 = system ? system.getExcitationProbability() : 0
      if (prob1 > 0.9) {
        useGameStore.getState().incrementScore(1)
      }
      worldItems.destroy(item.id)
      return null
    }

    if (tile) {
      const dir = findExitDirection(x, y, tile.direction)
      if (dir) {
        return DIR_VECTORS[dir]
      }
    }
    return null
  })
}
