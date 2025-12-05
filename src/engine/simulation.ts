import { worldGrid, type Direction } from './grid'
import { worldItems, type Item } from './items'
import { getGate } from '../content/registry'
import { useGameStore } from '../state/useGameStore'
import { LinAlg } from './quantum'

const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
}

const processedLog = new Map<string, true>()
let spawnTimer = 0
const SPAWN_RATE = 500
const splitterToggle = new Map<string, boolean>()

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

  // Process controlled (multi-qubit) gates after movement
  const occupancy = new Map<string, Item[]>()
  for (const item of worldItems.getAll()) {
    const gx = Math.round(item.x)
    const gy = Math.round(item.y)
    const key = `${gx},${gy}`
    const list = occupancy.get(key) || []
    list.push(item)
    occupancy.set(key, list)
  }

  const cnotMatrix = LinAlg.parseMatrix([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
    [0, 0, 1, 0],
  ])

  occupancy.forEach((items, key) => {
    const [xStr, yStr] = key.split(',')
    const gx = Number(xStr)
    const gy = Number(yStr)
    const tile = worldGrid.get(gx, gy)
    if (!tile || tile.kind !== 'printer' || !tile.gateId) return
    const gateDef = getGate(tile.gateId)
    if (!gateDef || gateDef.behavior.type !== 'controlled') return
    if (items.length < 2) return

    // deterministic control/target: leftmost is control, then by y, then id
    const sorted = [...items].sort((a, b) => {
      const ax = Math.round(a.x)
      const bx = Math.round(b.x)
      if (ax !== bx) return ax - bx
      const ay = Math.round(a.y)
      const by = Math.round(b.y)
      if (ay !== by) return ay - by
      return a.id - b.id
    })
    const control = sorted[0]
    const target = sorted[1]
    const controlSys = worldItems.systems.get(control.systemId)
    const targetSys = worldItems.systems.get(target.systemId)
    if (!controlSys || !targetSys) return

    if (controlSys.id !== targetSys.id) {
      // For now only merge single-qubit systems to keep indices contiguous
      if (controlSys.qubitCount !== 1 || targetSys.qubitCount !== 1) return
      worldItems.mergeSystems(control, target)
    }

    const system = worldItems.systems.get(control.systemId)
    if (!system) return

    const ctrlIndex = control.qubitIndex
    const tgtIndex = target.qubitIndex
    if (Math.abs(ctrlIndex - tgtIndex) !== 1) return
    const minIndex = Math.min(ctrlIndex, tgtIndex)

    const preSize = Math.pow(2, minIndex)
    const postSize = Math.pow(2, system.qubitCount - minIndex - 2)
    let full = LinAlg.tensorMat(LinAlg.eye(preSize), cnotMatrix)
    full = LinAlg.tensorMat(full, LinAlg.eye(postSize))
    system.vector = LinAlg.apply(full, system.vector)
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
      const contract = useGameStore.getState().contract
      const matches =
        contract &&
        !contract.completed &&
        ((contract.target === 'one' && prob1 > 0.9) ||
          (contract.target === 'zero' && prob1 < 0.1) ||
          (contract.target === 'plus' && prob1 > 0.4 && prob1 < 0.6))
      if (matches) {
        useGameStore.getState().incrementDelivered()
        if (contract.rewardPerUnit) {
          useGameStore.getState().addCredits(contract.rewardPerUnit)
        }
      }
      worldItems.destroy(item.id)
      return null
    }
    if (tile && tile.kind === 'splitter') {
      const primary = tile.direction || 'east'
      const secondary = primary === 'east' ? 'south' : primary === 'south' ? 'west' : primary === 'west' ? 'north' : 'east'
      const key = `${x},${y}`
      const toggle = splitterToggle.get(key) || false
      splitterToggle.set(key, !toggle)
      return DIR_VECTORS[toggle ? primary : secondary]
    }
    if (tile && tile.kind === 'merger') {
      // merge simply forwards in its direction or any connected belt
      const dir = tile.direction || findExitDirection(x, y, undefined)
      if (dir) return DIR_VECTORS[dir]
    }
    if (tile && tile.kind === 'detector') {
      const system = worldItems.systems.get(item.systemId)
      if (system) {
        const resultIndex = system.measure()
        system.collapseToBasis(resultIndex)
        if (resultIndex === 0) {
          const dir = tile.direction || 'east'
          return DIR_VECTORS[dir]
        } else {
          // secondary path: rotate 90 deg clockwise from primary
          const dir = tile.direction || 'east'
          const secondary = dir === 'east' ? 'south' : dir === 'south' ? 'west' : dir === 'west' ? 'north' : 'east'
          return DIR_VECTORS[secondary]
        }
      }
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
