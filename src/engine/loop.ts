import { useGameStore } from '../state/useGameStore'
import { updateSimulation } from './simulation'

type SimTick = (dt: number) => void
type RenderTick = (alpha: number, frameDt: number) => void

const simSubscribers = new Set<SimTick>()
const renderSubscribers = new Set<RenderTick>()

let rafId: number | null = null
let lastTime = performance.now()
let accumulator = 0

const SIM_DT = 50 // 20 ticks/sec for deterministic logic

function frame(now: number) {
  const frameDt = now - lastTime
  accumulator += frameDt
  lastTime = now

  // Run fixed-step simulation ticks
  while (accumulator >= SIM_DT) {
    useGameStore.getState().advanceTick()
    updateSimulation(SIM_DT)
    simSubscribers.forEach((fn) => fn(SIM_DT))
    accumulator -= SIM_DT
  }

  const alpha = accumulator / SIM_DT
  renderSubscribers.forEach((fn) => fn(alpha, frameDt))
  rafId = requestAnimationFrame(frame)
}

export function startLoop() {
  if (rafId !== null) return
  lastTime = performance.now()
  accumulator = 0
  rafId = requestAnimationFrame(frame)
}

export function stopLoop() {
  if (rafId === null) return
  cancelAnimationFrame(rafId)
  rafId = null
}

export function onSimTick(fn: SimTick) {
  simSubscribers.add(fn)
  return () => simSubscribers.delete(fn)
}

export function onRender(fn: RenderTick) {
  renderSubscribers.add(fn)
  return () => renderSubscribers.delete(fn)
}
