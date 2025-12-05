import { useEffect, useRef } from 'react'
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
  TextStyle,
  Sprite,
  Texture,
} from 'pixi.js'
import { startLoop, stopLoop, onRender } from '../engine/loop'
import { worldGrid } from '../engine/grid'
import { useGameStore } from '../state/useGameStore'
import { worldItems } from '../engine/items'

const CELL_SIZE = 48
const ITEM_COLORS = {
  zero: 0x00d2ff,
  one: 0xbd00ff,
  super: 0xffffff,
}

function createGlowTexture(): Texture {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return Texture.WHITE
  const cx = size / 2
  const cy = size / 2
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.7)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy, cx, 0, Math.PI * 2)
  ctx.fill()
  return Texture.from(canvas)
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)

  const viewportRef = useRef<Container | null>(null)
  const gridLayerRef = useRef<Container | null>(null)
  const tileLayerRef = useRef<Container | null>(null)
  const itemLayerRef = useRef<Container | null>(null)
  const ghostLayerRef = useRef<Container | null>(null)
  const gridGraphicsRef = useRef<Graphics | null>(null)
  const lastGridVersionRef = useRef<number>(-1)
  const itemSpritePoolRef = useRef<Map<number, Sprite>>(new Map())
  const glowTextureRef = useRef<Texture | null>(null)
  const occupancySnapshotRef = useRef<Map<string, number>>(new Map())

  const isPanning = useRef(false)
  const isDraggingAction = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const dragButton = useRef<number | null>(null)
  const zoomRef = useRef(1)
  const buildDirRef = useRef<'north' | 'south' | 'east' | 'west'>('east')

  const drawGateSprite = (g: Graphics, _id: string | undefined, size: number) => {
    g.rect(2, 2, size - 4, size - 4)
    g.fill(0x2a3b55)
    g.stroke({ width: 2, color: 0x6cd0ff })
  }

  const renderGrid = (app: Application) => {
    const layer = gridLayerRef.current
    const viewport = viewportRef.current
    if (!layer || !viewport) return

    let g = gridGraphicsRef.current
    if (!g) {
      g = new Graphics()
      gridGraphicsRef.current = g
      layer.addChild(g)
    }
    g.clear()

    const scaleX = viewport.scale.x || 1
    const scaleY = viewport.scale.y || 1
    const startX = Math.floor(-viewport.x / CELL_SIZE / scaleX) - 1
    const startY = Math.floor(-viewport.y / CELL_SIZE / scaleY) - 1
    const cols = Math.ceil(app.screen.width / CELL_SIZE / scaleX) + 2
    const rows = Math.ceil(app.screen.height / CELL_SIZE / scaleY) + 2
    const endX = startX + cols
    const endY = startY + rows

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
    if (worldGrid.version === lastGridVersionRef.current) return
    lastGridVersionRef.current = worldGrid.version
    layer.removeChildren()

    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#ffffff',
    })
    const occ = occupancySnapshotRef.current

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
        arrow.rotation =
          dir === 'north' ? -Math.PI / 2 : dir === 'south' ? Math.PI / 2 : dir === 'west' ? Math.PI : 0
        arrow.position.set(x * CELL_SIZE, y * CELL_SIZE)
        g.position.set(x * CELL_SIZE, y * CELL_SIZE)
        layer.addChild(g)
        layer.addChild(arrow)
        const key = `${x},${y}`
        if (occ.get(key) && (occ.get(key) ?? 0) > 1) {
          const warning = new Graphics()
          warning.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
          warning.stroke({ width: 2, color: 0xff5555, alpha: 0.8 })
          layer.addChild(warning)
        }
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
          if (tile.gateId === 'cnot') {
            const overlay = new Graphics()
            overlay.lineStyle(2, 0x6cd0ff, 0.7)
            overlay.moveTo(x * CELL_SIZE + 6, y * CELL_SIZE + CELL_SIZE / 2)
            overlay.lineTo(x * CELL_SIZE + CELL_SIZE - 6, y * CELL_SIZE + CELL_SIZE / 2)
            const control = new Graphics()
            control.circle(x * CELL_SIZE + 10, y * CELL_SIZE + CELL_SIZE / 2, 4).fill(0x6cd0ff)
            const target = new Graphics()
            target.circle(x * CELL_SIZE + CELL_SIZE - 10, y * CELL_SIZE + CELL_SIZE / 2, 6).stroke({
              width: 2,
              color: 0xffffff,
            })
            layer.addChild(overlay, control, target)
          }
        }
      } else if (tile.kind === 'detector') {
        g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
        g.fill(0x9b59ff)
        g.stroke({ width: 2, color: 0xffffff })
        const text = new Text({
          text: 'ME',
          style: labelStyle,
        })
        text.anchor.set(0.5)
        text.position.set(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        layer.addChild(g, text)
      } else if (tile.kind === 'splitter') {
        g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
        g.fill(0x33ff66)
        g.stroke({ width: 2, color: 0x6cd0ff })
        const text = new Text({ text: 'SP', style: labelStyle })
        text.anchor.set(0.5)
        text.position.set(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        const arrows = new Graphics()
        arrows.lineStyle(2, 0xffffff, 0.7)
        arrows.moveTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        arrows.lineTo(x * CELL_SIZE + CELL_SIZE - 6, y * CELL_SIZE + CELL_SIZE / 2 - 8)
        arrows.moveTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        arrows.lineTo(x * CELL_SIZE + CELL_SIZE - 6, y * CELL_SIZE + CELL_SIZE / 2 + 8)
        layer.addChild(g, text)
        layer.addChild(arrows)
      } else if (tile.kind === 'merger') {
        g.rect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4)
        g.fill(0x2a3b55)
        g.stroke({ width: 2, color: 0x6cd0ff })
        const text = new Text({ text: 'MG', style: labelStyle })
        text.anchor.set(0.5)
        text.position.set(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        const arrows = new Graphics()
        arrows.lineStyle(2, 0xffffff, 0.7)
        arrows.moveTo(x * CELL_SIZE + 6, y * CELL_SIZE + CELL_SIZE / 2 - 8)
        arrows.lineTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        arrows.moveTo(x * CELL_SIZE + 6, y * CELL_SIZE + CELL_SIZE / 2 + 8)
        arrows.lineTo(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
        layer.addChild(g, text, arrows)
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
    const pool = itemSpritePoolRef.current
    const texture = glowTextureRef.current
    if (!layer || !texture) return
    occupancySnapshotRef.current = worldItems.getOccupancySnapshot()
    const active = new Set<number>()

    for (const item of worldItems.getAll()) {
      active.add(item.id)
      let sprite = pool.get(item.id)
      if (!sprite) {
        sprite = new Sprite(texture)
        sprite.anchor.set(0.5)
        layer.addChild(sprite)
        pool.set(item.id, sprite)
      }
      const system = worldItems.systems.get(item.systemId)
      const prob1 = system ? system.getExcitationProbability() : 0
      let color = ITEM_COLORS.super
      if (prob1 > 0.9) color = ITEM_COLORS.one
      else if (prob1 < 0.1) color = ITEM_COLORS.zero
      sprite.tint = color
      sprite.x = item.x * CELL_SIZE + CELL_SIZE / 2
      sprite.y = item.y * CELL_SIZE + CELL_SIZE / 2
      if (prob1 >= 0.1 && prob1 <= 0.9) {
        const pulse = Math.sin(performance.now() / 100) * 0.1 + 0.9
        sprite.alpha = pulse
      } else {
        sprite.alpha = 1
      }
    }

    for (const [id, sprite] of pool.entries()) {
      if (!active.has(id)) {
        layer.removeChild(sprite)
        sprite.destroy()
        pool.delete(id)
      }
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
      buildDirRef.current = state.buildDirection
      const costMap: Record<string, number> = {
        conveyor: 1,
        h: 4,
        x: 6,
        z: 6,
        cnot: 12,
        detector: 8,
        splitter: 6,
        merger: 4,
      }
      const cost = costMap[state.selectedBuildId] ?? 5
      const ok = state.spendCredits ? state.spendCredits(cost) : true
      if (!ok) return
      if (state.selectedBuildId === 'conveyor') {
        worldGrid.set(gridX, gridY, { kind: 'conveyor', direction: buildDirRef.current })
      } else if (state.selectedBuildId === 'splitter') {
        worldGrid.set(gridX, gridY, { kind: 'splitter', direction: buildDirRef.current })
      } else if (state.selectedBuildId === 'merger') {
        worldGrid.set(gridX, gridY, { kind: 'merger', direction: buildDirRef.current })
      } else if (state.selectedBuildId === 'detector') {
        worldGrid.set(gridX, gridY, { kind: 'detector', direction: buildDirRef.current })
      } else {
        worldGrid.set(gridX, gridY, {
          kind: 'printer',
          direction: buildDirRef.current,
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

      glowTextureRef.current = createGlowTexture()

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

        // dispatch inspect coordinates for inspector panel
        const evt = new CustomEvent('inspector-click', { detail: null })
        ;(evt as any).x = gridX
        ;(evt as any).y = gridY
        window.dispatchEvent(evt)

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
              if (state.selectedBuildId === 'detector') {
                const text2 = new Text({ text: 'ME', style: { fontFamily: 'monospace', fontSize: 16, fill: '#fff' } })
                text2.anchor.set(0.5)
                text2.position.set(CELL_SIZE / 2, CELL_SIZE / 2 + 12)
                wrapper.addChild(text2)
              }
              if (state.selectedBuildId === 'cnot') {
                const overlay = new Graphics()
                overlay.lineStyle(2, 0x6cd0ff, 0.5)
                overlay.moveTo(6, CELL_SIZE / 2)
                overlay.lineTo(CELL_SIZE - 6, CELL_SIZE / 2)
                const control = new Graphics()
                control.circle(10, CELL_SIZE / 2, 4).fill(0x6cd0ff)
                const target = new Graphics()
                target.circle(CELL_SIZE - 10, CELL_SIZE / 2, 6).stroke({ width: 2, color: 0xffffff })
                wrapper.addChild(overlay, control, target)
              }
            }
            wrapper.addChild(g)
            wrapper.position.set(gridX * CELL_SIZE, gridY * CELL_SIZE)
            wrapper.rotation =
              buildDirRef.current === 'north'
                ? -Math.PI / 2
                : buildDirRef.current === 'south'
                  ? Math.PI / 2
                  : buildDirRef.current === 'west'
                    ? Math.PI
                    : 0
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
