import { useEffect, useRef } from 'react'
import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js'
import { startLoop, stopLoop, onRender } from '../engine/loop'
import { worldGrid } from '../engine/grid'
import { useGameStore } from '../state/useGameStore'
import { worldItems } from '../engine/items'

const CELL_SIZE = 48
const GRID_COLS = 20
const GRID_ROWS = 12

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)
  const tileLayerRef = useRef<Container | null>(null)
  const itemLayerRef = useRef<Container | null>(null)
  const ghostLayerRef = useRef<Container | null>(null)
  const mouseRef = useRef<{ x: number; y: number } | null>(null)

  const renderTiles = () => {
    const layer = tileLayerRef.current
    if (!layer) return
    layer.removeChildren()
    worldGrid.forEach(({ x, y }, tile) => {
      const g = new Graphics()
      if (tile.kind === 'conveyor') {
        g.rect(0, 0, CELL_SIZE, CELL_SIZE)
        g.fill(0x33ff66)
        g.rect(CELL_SIZE - 12, CELL_SIZE / 2 - 6, 8, 12)
        g.fill(0x0a0f1a)
      } else if (tile.kind === 'printer') {
        g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
        g.fill(0x6cd0ff)
        g.rect(10, 10, CELL_SIZE - 20, CELL_SIZE - 20)
        g.fill(0x0a0f1a)
      }
      g.position.set(x * CELL_SIZE, y * CELL_SIZE)
      layer.addChild(g)
    })
  }

  const renderItems = () => {
    const layer = itemLayerRef.current
    if (!layer) return
    layer.removeChildren()

    for (const item of worldItems.getAll()) {
      const g = new Graphics()
      g.circle(0, 0, 8)
      g.fill(0xffffff)
      g.stroke({ width: 2, color: 0x6cd0ff })
      g.position.set(item.x * CELL_SIZE + CELL_SIZE / 2, item.y * CELL_SIZE + CELL_SIZE / 2)
      layer.addChild(g)
    }
  }

  const renderGhost = () => {
    const layer = ghostLayerRef.current
    if (!layer) return
    layer.removeChildren()
    const mouse = mouseRef.current
    const state = useGameStore.getState()
    if (!mouse || state.interactionMode !== 'build' || !state.selectedBuildId) return

    const g = new Graphics()
    g.position.set(mouse.x * CELL_SIZE, mouse.y * CELL_SIZE)
    if (state.selectedBuildId === 'conveyor') {
      g.rect(0, 0, CELL_SIZE, CELL_SIZE)
      g.fill({ color: 0x33ff66, alpha: 0.35 })
    } else {
      g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
      g.fill({ color: 0x6cd0ff, alpha: 0.35 })
    }
    layer.addChild(g)
  }

  useEffect(() => {
    if (!containerRef.current) return

    let destroyed = false

    const bootstrap = async () => {
      const app = new Application()
      await app.init({
        width: GRID_COLS * CELL_SIZE,
        height: GRID_ROWS * CELL_SIZE,
        backgroundAlpha: 0,
        antialias: true,
      })

      // Drive Pixi via our loop; avoid its internal RAF
      app.ticker.stop()

      if (destroyed) {
        app.destroy()
        return
      }

      appRef.current = app
      containerRef.current?.appendChild(app.canvas)

      const gridLayer = new Container()
      const tileLayer = new Container()
      const itemLayer = new Container()
      const ghostLayer = new Container()
      ghostLayer.alpha = 0.7
      tileLayerRef.current = tileLayer
      itemLayerRef.current = itemLayer
      ghostLayerRef.current = ghostLayer
      app.stage.addChild(gridLayer, tileLayer, itemLayer, ghostLayer)

      // Subtle grid lines
      const gridGfx = new Graphics()
      gridGfx.strokeStyle = { width: 1, color: 0xffffff, alpha: 0.05 }
      for (let x = 0; x <= GRID_COLS; x++) {
        gridGfx.moveTo(x * CELL_SIZE, 0).lineTo(x * CELL_SIZE, GRID_ROWS * CELL_SIZE)
      }
      for (let y = 0; y <= GRID_ROWS; y++) {
        gridGfx.moveTo(0, y * CELL_SIZE).lineTo(GRID_COLS * CELL_SIZE, y * CELL_SIZE)
      }
      gridGfx.stroke()

      gridLayer.addChild(gridGfx)

      // Pointer -> grid placement
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen
      app.canvas.style.cursor = 'crosshair'

      const handlePointerDown = (e: FederatedPointerEvent) => {
        const state = useGameStore.getState()
        const x = Math.floor(e.global.x / CELL_SIZE)
        const y = Math.floor(e.global.y / CELL_SIZE)
        if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return

        if (e.button === 1) {
          worldItems.spawn(x, y)
          return
        }

        if (state.interactionMode === 'build' && state.selectedBuildId) {
          if (state.selectedBuildId === 'conveyor') {
            worldGrid.set(x, y, { kind: 'conveyor', direction: 'east' })
          } else {
            worldGrid.set(x, y, { kind: 'printer', direction: 'south' })
          }
        } else if (state.interactionMode === 'erase') {
          worldGrid.remove(x, y)
        }
      }

      const handlePointerMove = (e: FederatedPointerEvent) => {
        const x = Math.floor(e.global.x / CELL_SIZE)
        const y = Math.floor(e.global.y / CELL_SIZE)
        const prev = mouseRef.current
        if (prev && prev.x === x && prev.y === y) return
        mouseRef.current = { x, y }
      }

      app.stage.on('pointerdown', handlePointerDown)
      app.stage.on('pointermove', handlePointerMove)

      // Render hook for future animated interpolation
      const unsubscribeRender = onRender(() => {
        renderTiles()
        renderItems()
        renderGhost()
        app.render()
      })

      startLoop()

      return () => {
        unsubscribeRender()
        app.stage.off('pointerdown', handlePointerDown)
        app.stage.off('pointermove', handlePointerMove)
        stopLoop()
        app.destroy()
        appRef.current = null
        tileLayerRef.current = null
        ghostLayerRef.current = null
      }
    }

    const teardownPromise = bootstrap()

    return () => {
      destroyed = true
      teardownPromise.then((cleanup) => {
        if (cleanup) cleanup()
      })
    }
  }, [])

  return <div ref={containerRef} className="canvas-shell" />
}
