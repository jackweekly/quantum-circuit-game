import { useEffect, useRef } from 'react'
import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js'
import { startLoop, stopLoop, onRender } from '../engine/loop'
import { worldGrid } from '../engine/grid'
import { useGameStore } from '../state/useGameStore'
import { worldItems } from '../engine/items'

const CELL_SIZE = 48

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)

  const viewportRef = useRef<Container | null>(null)
  const gridLayerRef = useRef<Container | null>(null)
  const tileLayerRef = useRef<Container | null>(null)
  const itemLayerRef = useRef<Container | null>(null)
  const ghostLayerRef = useRef<Container | null>(null)

  const isPanning = useRef(false)
  const isDraggingAction = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const dragButton = useRef<number | null>(null)

  const renderGrid = (app: Application) => {
    const layer = gridLayerRef.current
    const viewport = viewportRef.current
    if (!layer || !viewport) return

    layer.removeChildren()
    const g = new Graphics()

    const startX = Math.floor(-viewport.x / CELL_SIZE) - 1
    const startY = Math.floor(-viewport.y / CELL_SIZE) - 1
    const endX = startX + Math.ceil(app.screen.width / CELL_SIZE) + 2
    const endY = startY + Math.ceil(app.screen.height / CELL_SIZE) + 2

    g.strokeStyle = { width: 1, color: 0xffffff, alpha: 0.05 }

    for (let x = startX; x <= endX; x++) {
      g.moveTo(x * CELL_SIZE, startY * CELL_SIZE)
      g.lineTo(x * CELL_SIZE, endY * CELL_SIZE)
    }
    for (let y = startY; y <= endY; y++) {
      g.moveTo(startX * CELL_SIZE, y * CELL_SIZE)
      g.lineTo(endX * CELL_SIZE, y * CELL_SIZE)
    }
    g.stroke()
    layer.addChild(g)
  }

  const renderTiles = () => {
    const layer = tileLayerRef.current
    if (!layer) return
    layer.removeChildren()

    worldGrid.forEach(({ x, y }, tile) => {
      const g = new Graphics()
      if (tile.kind === 'conveyor') {
        g.rect(0, 0, CELL_SIZE, CELL_SIZE)
        g.fill(0x33ff66)
        const dirOffsets: Record<string, number> = { north: 0, east: 1, south: 2, west: 3 }
        const rotation = ((dirOffsets[tile.direction || 'east'] || 1) * Math.PI) / 2
        g.rect(-4, -6, 8, 12)
        g.fill(0x0a0f1a)
        g.rotation = rotation
        g.position.set(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
      } else if (tile.kind === 'printer') {
        g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
        g.fill(0x6cd0ff)
        g.rect(10, 10, CELL_SIZE - 20, CELL_SIZE - 20)
        g.fill(0x0a0f1a)
        g.position.set(x * CELL_SIZE, y * CELL_SIZE)
      }
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

  const performAction = (gridX: number, gridY: number, button: number) => {
    const state = useGameStore.getState()
    if (button === 2) {
      worldGrid.remove(gridX, gridY)
      return
    }
    if (button === 0 && state.interactionMode === 'build' && state.selectedBuildId) {
      if (state.selectedBuildId === 'conveyor') {
        worldGrid.set(gridX, gridY, { kind: 'conveyor', direction: 'east' })
      } else {
        worldGrid.set(gridX, gridY, { kind: 'printer', direction: 'south' })
      }
    } else if (button === 0 && state.interactionMode === 'erase') {
      worldGrid.remove(gridX, gridY)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    const bootstrap = async () => {
      const app = new Application()
      await app.init({
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: true,
      })
      app.ticker.stop()

      if (destroyed) {
        app.destroy()
        return
      }

      appRef.current = app
      containerRef.current?.appendChild(app.canvas)
      app.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

      const viewport = new Container()
      viewportRef.current = viewport
      app.stage.addChild(viewport)

      const gridLayer = new Container()
      const tileLayer = new Container()
      const itemLayer = new Container()
      const ghostLayer = new Container()

      gridLayerRef.current = gridLayer
      tileLayerRef.current = tileLayer
      itemLayerRef.current = itemLayer
      ghostLayerRef.current = ghostLayer

      viewport.addChild(gridLayer, tileLayer, itemLayer, ghostLayer)

      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen
      app.canvas.style.cursor = 'crosshair'

      const getGridPos = (globalX: number, globalY: number) => {
        const local = viewport.toLocal({ x: globalX, y: globalY })
        return { x: Math.floor(local.x / CELL_SIZE), y: Math.floor(local.y / CELL_SIZE) }
      }

      app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
        const btn = e.button
        lastMouse.current = { x: e.global.x, y: e.global.y }
        dragButton.current = btn

        if (btn === 1) {
          isPanning.current = true
          return
        }

        isDraggingAction.current = true
        const { x, y } = getGridPos(e.global.x, e.global.y)
        performAction(x, y, btn)
      })

      app.stage.on('pointerup', () => {
        isPanning.current = false
        isDraggingAction.current = false
        dragButton.current = null
      })

      app.stage.on('pointerupoutside', () => {
        isPanning.current = false
        isDraggingAction.current = false
        dragButton.current = null
      })

      app.stage.on('pointermove', (e: FederatedPointerEvent) => {
        const { x: gridX, y: gridY } = getGridPos(e.global.x, e.global.y)

        if (isPanning.current) {
          const dx = e.global.x - lastMouse.current.x
          const dy = e.global.y - lastMouse.current.y
          const viewport = viewportRef.current
          if (viewport) {
            viewport.position.x += dx
            viewport.position.y += dy
          }
          lastMouse.current = { x: e.global.x, y: e.global.y }
        }

        if (isDraggingAction.current && dragButton.current !== null) {
          performAction(gridX, gridY, dragButton.current)
        }

        const ghostLayer = ghostLayerRef.current
        if (ghostLayer) {
          ghostLayer.removeChildren()
          const state = useGameStore.getState()
          if (state.interactionMode === 'build' && state.selectedBuildId) {
            const g = new Graphics()
            g.position.set(gridX * CELL_SIZE, gridY * CELL_SIZE)
            if (state.selectedBuildId === 'conveyor') {
              g.rect(0, 0, CELL_SIZE, CELL_SIZE)
              g.fill({ color: 0x33ff66, alpha: 0.5 })
            } else {
              g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
              g.fill({ color: 0x6cd0ff, alpha: 0.5 })
            }
            ghostLayer.addChild(g)
          }
        }
      })

      const unsubscribeRender = onRender(() => {
        renderGrid(app)
        renderTiles()
        renderItems()
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
