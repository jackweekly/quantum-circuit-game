import gates from './gates.json'

export type GateBehavior =
  | { type: 'classical' }
  | { type: 'unitary'; matrix: (number | string)[][] }
  | { type: 'controlled'; controlCount: number }
  | { type: 'measurement' }

export interface GateDefinition {
  id: string
  name: string
  sprite: string
  cost: number
  category: string
  unlockedAtChapter: number
  tooltipKey: string
  behavior: GateBehavior
  visualOperation?: string
}

const registry = new Map<string, GateDefinition>()

gates.forEach((gate) => {
  registry.set(gate.id, gate as GateDefinition)
})

export function getGate(id: string) {
  return registry.get(id)
}

export function listGates() {
  return Array.from(registry.values())
}
