export type Direction = 'north' | 'south' | 'east' | 'west'

export type TileKind = 'empty' | 'conveyor' | 'printer' | 'linker' | 'sync' | 'scanner' | 'source' | 'sink'

export interface Tile {
  kind: TileKind
  direction?: Direction
  gateId?: string
  locked?: boolean
}

const key = (x: number, y: number) => `${x},${y}`

/**
 * Sparse grid for an unbounded factory floor. Uses string keys to avoid
 * allocating large 2D arrays while still giving O(1) access per tile.
 */
export class GridManager {
  private tiles = new Map<string, Tile>()

  get(x: number, y: number): Tile | undefined {
    return this.tiles.get(key(x, y))
  }

  set(x: number, y: number, tile: Tile) {
    this.tiles.set(key(x, y), tile)
  }

  remove(x: number, y: number) {
    this.tiles.delete(key(x, y))
  }

  clear() {
    this.tiles.clear()
  }

  forEach(fn: (pos: { x: number; y: number }, tile: Tile) => void) {
    this.tiles.forEach((tile, k) => {
      const [xStr, yStr] = k.split(',')
      fn({ x: Number(xStr), y: Number(yStr) }, tile)
    })
  }
}

// Shared singleton for the active factory grid
export const worldGrid = new GridManager()
