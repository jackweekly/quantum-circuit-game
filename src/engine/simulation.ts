import { worldGrid, type Direction } from './grid'
import { worldItems } from './items'
import { getGate } from '../content/registry'
import { applyGate, measure } from './quantum'
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
          item.qubit = applyGate(item.qubit, gateDef.behavior.matrix)
        }
        processedLog.set(key, true)
        if (processedLog.size > 1000) processedLog.clear()
      }
    }

    if (tile && tile.kind === 'scanner') {
      measure(item.qubit)
      worldItems.destroy(item.id)
      return null
    }

    if (tile && tile.kind === 'sink') {
      const prob1 = item.qubit.getExcitationProbability()
      if (prob1 > 0.9) {
        useGameStore.getState().incrementScore(1)
      }
      worldItems.destroy(item.id)
      return null
    }

    if (tile && tile.direction) {
      return DIR_VECTORS[tile.direction]
    }
    return null
  })
}
