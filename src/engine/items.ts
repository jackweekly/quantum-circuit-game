import { QuantumState, type Qubit } from './quantum'

export interface Item {
  id: number
  x: number
  y: number
  targetX?: number
  targetY?: number
  speed: number
  qubit: Qubit
}

class ItemManager {
  private items = new Map<number, Item>()
  private nextId = 1

  spawn(x: number, y: number) {
    const id = this.nextId++
    this.items.set(id, {
      id,
      x,
      y,
      speed: 4.0,
      qubit: new QuantumState(),
    })
  }

  getAll(): Iterable<Item> {
    return this.items.values()
  }

  destroy(id: number) {
    this.items.delete(id)
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
            item.targetX = gridX + dir.dx
            item.targetY = gridY + dir.dy
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
