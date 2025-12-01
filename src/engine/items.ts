import { QuantumSystem } from './quantum'

export interface Item {
  id: number
  x: number
  y: number
  targetX?: number
  targetY?: number
  speed: number
  systemId: string
  qubitIndex: number
}

class ItemManager {
  private items = new Map<number, Item>()
  private nextId = 1
  public systems = new Map<string, QuantumSystem>()
  private nextSystemId = 1

  spawn(x: number, y: number) {
    const id = this.nextId++
    const sysId = `sys_${this.nextSystemId++}`
    this.systems.set(sysId, new QuantumSystem())
    this.items.set(id, {
      id,
      x,
      y,
      speed: 4.0,
      systemId: sysId,
      qubitIndex: 0,
    })
  }

  getAll(): Iterable<Item> {
    return this.items.values()
  }

  getItemsAt(gridX: number, gridY: number): Item[] {
    const result: Item[] = []
    for (const item of this.items.values()) {
      if (Math.round(item.x) === gridX && Math.round(item.y) === gridY) {
        result.push(item)
      }
    }
    return result
  }

  private isTileBlocked(tx: number, ty: number, excludeId: number) {
    for (const item of this.items.values()) {
      if (item.id === excludeId) continue
      const itemGridX = Math.round(item.x)
      const itemGridY = Math.round(item.y)
      const movingToTarget = item.targetX === tx && item.targetY === ty
      if ((itemGridX === tx && itemGridY === ty) || movingToTarget) {
        return true
      }
    }
    return false
  }

  destroy(id: number) {
    const item = this.items.get(id)
    if (item) {
      this.systems.delete(item.systemId)
      this.items.delete(id)
    }
  }

  destroyAll() {
    this.items.clear()
    this.systems.clear()
  }

  mergeSystems(control: Item, target: Item) {
    const controlSys = this.systems.get(control.systemId)
    const targetSys = this.systems.get(target.systemId)
    if (!controlSys || !targetSys) return
    if (controlSys.id === targetSys.id) return

    const offset = controlSys.qubitCount
    controlSys.merge(targetSys)

    for (const item of this.items.values()) {
      if (item.systemId === targetSys.id) {
        item.systemId = controlSys.id
        item.qubitIndex += offset
      }
    }
    this.systems.delete(targetSys.id)
  }

  update(
    dt: number,
    getTileDirection: (
      item: Item,
      x: number,
      y: number,
    ) => { dx: number; dy: number } | null,
  ) {
    const deltaSeconds = dt / 1000
    for (const item of this.items.values()) {
      if (item.targetX === undefined || item.targetY === undefined) {
        const gridX = Math.round(item.x)
        const gridY = Math.round(item.y)
        const dist = Math.hypot(item.x - gridX, item.y - gridY)
        if (dist < 0.05) {
          item.x = gridX
          item.y = gridY
          const dir = getTileDirection(item, gridX, gridY)
          if (dir) {
            const nextX = gridX + dir.dx
            const nextY = gridY + dir.dy
            if (!this.isTileBlocked(nextX, nextY, item.id)) {
              item.targetX = nextX
              item.targetY = nextY
            } else {
              item.targetX = undefined
              item.targetY = undefined
            }
          }
        }
      }

      if (item.targetX !== undefined && item.targetY !== undefined) {
        const dx = item.targetX - item.x
        const dy = item.targetY - item.y
        const dist = Math.hypot(dx, dy)
        const moveDist = item.speed * deltaSeconds
        if (dist <= moveDist) {
          item.x = item.targetX
          item.y = item.targetY
          item.targetX = undefined
          item.targetY = undefined
        } else {
          item.x += (dx / dist) * moveDist
          item.y += (dy / dist) * moveDist
        }
      }
    }
  }
}

export const worldItems = new ItemManager()
