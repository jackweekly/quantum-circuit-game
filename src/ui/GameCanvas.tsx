import { useEffect, useRef } from 'react'
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js'
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
  const zoomRef = useRef(1)

  const drawGateSprite = (g: Graphics, _id: string | undefined, size: number) => {
    g.rect(2, 2, size - 4, size - 4)
    g.fill(0x2a3b55)
    g.stroke({ width: 2, color: 0x6cd0ff })
  }

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

    g.strokeStyle = { width: 1, color: 0xffffff, alpha: 0.08 }

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

    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#ffffff',
    })

    worldGrid.forEach(({ x, y }, tile) => {
      const g = new Graphics()
      if (tile.kind === 'conveyor') {
        g.rect(0, 0, CELL_SIZE, CELL_SIZE).fill(0x33ff66)
        const cx = CELL_SIZE / 2
        const cy = CELL_SIZE / 2
        const arrow = new Graphics()
        arrow.moveTo(cx - 6, cy - 6).lineTo(cx + 10, cy).lineTo(cx - 6, cy + 6).lineTo(cx - 6, cy - 6)
        arrow.fill(0x0a0f1a)
        const dir = tile.direction || 'east'
        if (dir === 'north') arrow.rotation = -Math.PI / 2
        if (dir === 'south') arrow.rotation = Math.PI / 2
        if (dir === 'west') arrow.rotation = Math.PI
        arrow.position.set(x * CELL_SIZE, y * CELL_SIZE)
        g.position.set(x * CELL_SIZE, y * CELL_SIZE)
        layer.addChild(g)
        layer.addChild(arrow)
      } else if (tile.kind === 'printer') {
        g.position.set(x * CELL_SIZE, y * CELL_SIZE)
        drawGateSprite(g, tile.gateId, CELL_SIZE)
        layer.addChild(g)
        if (tile.gateId) {
          const text = new Text({
            text: tile.gateId.toUpperCase().slice(0, 2),
            style: labelStyle,
          })
          text.anchor.set(0.5)
          text.position.set(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
          layer.addChild(text)
        }
      } else if (tile.kind === 'source') {
        g.rect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8).fill(0xffaa00)
        const arrow = new Graphics()
        arrow.rect(CELL_SIZE / 2 - 4, -6, 8, 12).fill(0xffffff)
        const dirOffsets: Record<string, number> = { north: 0, east: 1, south: 2, west: 3 }
        const rotation = ((dirOffsets[tile.direction || 'east'] || 0) * Math.PI) / 2
        arrow.rotation = rotation
        arrow.position.set(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        g.position.set(x * CELL_SIZE, y * CELL_SIZE)
        layer.addChild(g)
        layer.addChild(arrow)
      } else if (tile.kind === 'sink') {
        g.rect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8)
        g.fill(0xaa00aa)
        g.stroke({ width: 2, color: 0xffffff })
        g.position.set(x * CELL_SIZE, y * CELL_SIZE)
        layer.addChild(g)
      }
    })
  }

  const renderItems = () => {
    const layer = itemLayerRef.current
    if (!layer) return
    layer.removeChildren()

    for (const item of worldItems.getAll()) {
      const system = worldItems.systems.get(item.systemId)
      const prob1 = system ? system.getExcitationProbability() : 0
      let color = 0x6cd0ff
      if (prob1 > 0.9) color = 0xff00ff
      else if (prob1 > 0.4) color = 0xffffff

      const g = new Graphics()
      g.circle(0, 0, 6)
      g.fill(color)
      g.stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
      g.position.set(item.x * CELL_SIZE + CELL_SIZE / 2, item.y * CELL_SIZE + CELL_SIZE / 2)
      layer.addChild(g)
    }
  }

  const performAction = (gridX: number, gridY: number, button: number) => {
    const state = useGameStore.getState()
    if (button === 2) {
      const tile = worldGrid.get(gridX, gridY)
      if (tile?.locked) return
      worldGrid.remove(gridX, gridY)
      return
    }
    if (button === 0 && state.interactionMode === 'build' && state.selectedBuildId) {
      if (state.selectedBuildId === 'conveyor') {
        worldGrid.set(gridX, gridY, { kind: 'conveyor', direction: 'east' })
      } else {
        worldGrid.set(gridX, gridY, {
          kind: 'printer',
          direction: 'east',
          gateId: state.selectedBuildId,
        })
      }
    } else if (button === 0 && state.interactionMode === 'erase') {
      worldGrid.remove(gridX, gridY)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    const bootstrap = async () => {
      const host = containerRef.current
      if (!host) return

      const app = new Application()
      await app.init({
        width: host.clientWidth || 800,
        height: host.clientHeight || 600,
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

        if (e.shiftKey && btn === 0) {
          worldItems.spawn(x, y)
          return
        }

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
            const wrapper = new Container()
            const g = new Graphics()
            if (state.selectedBuildId === 'conveyor') {
              g.rect(0, 0, CELL_SIZE, CELL_SIZE).fill({ color: 0x33ff66, alpha: 0.5 })
              const arrow = new Graphics()
              const cx = CELL_SIZE / 2
              const cy = CELL_SIZE / 2
              arrow.moveTo(cx - 6, cy - 6).lineTo(cx + 10, cy).lineTo(cx - 6, cy + 6).lineTo(cx - 6, cy - 6)
              arrow.fill({ color: 0x0a0f1a, alpha: 0.6 })
              wrapper.addChild(arrow)
            } else {
              drawGateSprite(g, state.selectedBuildId, CELL_SIZE)
              const text = new Text({
                text: state.selectedBuildId.toUpperCase().slice(0, 2),
                style: { fontFamily: 'monospace', fontSize: 20, fill: 'rgba(255,255,255,0.7)' },
              })
              text.anchor.set(0.5)
              text.position.set(CELL_SIZE / 2, CELL_SIZE / 2)
              wrapper.addChild(text)
            }
            wrapper.addChild(g)
            wrapper.position.set(gridX * CELL_SIZE, gridY * CELL_SIZE)
            ghostLayer.addChild(wrapper)
          }
        }
      })

      const handleWheel = (e: WheelEvent) => {
        const viewport = viewportRef.current
        if (!viewport) return
        e.preventDefault()
        const scaleBefore = zoomRef.current
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const newScale = Math.min(2.5, Math.max(0.4, scaleBefore * factor))
        const rect = app.canvas.getBoundingClientRect()
        const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        const worldPosBefore = viewport.toLocal(mouse)
        viewport.scale.set(newScale)
        zoomRef.current = newScale
        const worldPosAfter = viewport.toLocal(mouse)
        viewport.position.x += (worldPosAfter.x - worldPosBefore.x) * newScale
        viewport.position.y += (worldPosAfter.y - worldPosBefore.y) * newScale
      }

      app.canvas.addEventListener('wheel', handleWheel, { passive: false })

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
        app.canvas.removeEventListener('wheel', handleWheel)
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
