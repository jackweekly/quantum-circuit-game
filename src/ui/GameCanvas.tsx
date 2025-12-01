import { useEffect, useRef } from 'react'
import { Application, Container, Graphics } from 'pixi.js'
import { startLoop, stopLoop, onRender } from '../engine/loop'

const CELL_SIZE = 48
const GRID_COLS = 14
const GRID_ROWS = 9

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)

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

      // Render hook for future animated interpolation
      const unsubscribeRender = onRender(() => {
        app.render()
      })

      startLoop()

      return () => {
        unsubscribeRender()
        stopLoop()
        app.destroy()
        appRef.current = null
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
