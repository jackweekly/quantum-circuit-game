import { useEffect, useRef } from 'react'
import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js'
import { startLoop, stopLoop, onRender } from '../engine/loop'
import { worldGrid } from '../engine/grid'

const CELL_SIZE = 48
const GRID_COLS = 14
const GRID_ROWS = 9

export type Tool = 'conveyor' | 'erase'

interface Props {
  selectedTool: Tool
}

export function GameCanvas({ selectedTool }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)
  const tileLayerRef = useRef<Container | null>(null)
  const toolRef = useRef<Tool>(selectedTool)

  useEffect(() => {
    toolRef.current = selectedTool
  }, [selectedTool])

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
      }
      g.position.set(x * CELL_SIZE, y * CELL_SIZE)
      layer.addChild(g)
    })
  }

  useEffect(() => {
    if (!containerRef.current) return

    let destroyed = false

    const bootstrap = async () => {
      const app = new Application()
      await app.init({
        width: GRID_COLS * CELL_SIZE,
        height: GRID_ROWS * CELL_SIZE,
        background: '#090d17',
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
      app.stage.addChild(gridLayer)

      // Simple checker grid for now
      const gridGfx = new Graphics()
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          gridGfx.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
          gridGfx.fill({ color: (x + y) % 2 === 0 ? 0x0f1628 : 0x10192d })
        }
      }
      gridLayer.addChild(gridGfx)

      const tileLayer = new Container()
      tileLayerRef.current = tileLayer
      app.stage.addChild(tileLayer)

      // Pointer -> grid placement
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen

      const handlePointerDown = (e: FederatedPointerEvent) => {
        const x = Math.floor(e.global.x / CELL_SIZE)
        const y = Math.floor(e.global.y / CELL_SIZE)
        if (x < 0 || y < 0) return
        if (toolRef.current === 'conveyor') {
          worldGrid.set(x, y, { kind: 'conveyor', direction: 'east' })
        } else if (toolRef.current === 'erase') {
          worldGrid.remove(x, y)
        }
      }

      app.stage.on('pointerdown', handlePointerDown)

      // Render hook for future animated interpolation
      const unsubscribeRender = onRender(() => {
        renderTiles()
        app.render()
      })

      startLoop()

      return () => {
        unsubscribeRender()
        app.stage.off('pointerdown', handlePointerDown)
        stopLoop()
        app.destroy()
        appRef.current = null
        tileLayerRef.current = null
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
