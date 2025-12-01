import { useGameStore } from '../state/useGameStore'

type TickFn = (delta: number) => void

let rafId: number | null = null
let last = performance.now()
const subscribers = new Set<TickFn>()

const TICK_MS = 100 // 10 ticks/sec

function step(now: number) {
  const delta = now - last
  if (delta >= TICK_MS) {
    useGameStore.getState().advanceTick()
    subscribers.forEach((fn) => fn(delta))
    last = now
  }
  rafId = requestAnimationFrame(step)
}

export function startLoop() {
  if (rafId !== null) return
  last = performance.now()
  rafId = requestAnimationFrame(step)
}

export function stopLoop() {
  if (rafId === null) return
  cancelAnimationFrame(rafId)
  rafId = null
}

export function onTick(fn: TickFn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
