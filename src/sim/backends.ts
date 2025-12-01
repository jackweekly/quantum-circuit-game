export type BackendId = 'arcade' | 'expert' | 'remote'

export interface Gate {
  id: string
  controls?: number[]
  targets: number[]
  matrix?: number[][] // optional for arcade mode
}

export interface Circuit {
  qubits: number
  gates: Gate[]
}

export interface RunResult {
  amplitudes?: number[]
  probabilities?: number[]
  notes?: string[]
}

export interface CircuitBackend {
  id: BackendId
  label: string
  runCircuit: (circuit: Circuit) => Promise<RunResult>
}

export function runCircuit(backend: CircuitBackend, circuit: Circuit) {
  return backend.runCircuit(circuit)
}
