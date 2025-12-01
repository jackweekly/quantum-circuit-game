// src/engine/quantum.ts

export interface Complex {
  re: number
  im: number
}

export const C = {
  zero: { re: 0, im: 0 },
  one: { re: 1, im: 0 },
  i: { re: 0, im: 1 },
  add: (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a: Complex, b: Complex): Complex => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  }),
  scale: (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s }),
  abs2: (a: Complex): number => a.re * a.re + a.im * a.im,
  div: (a: Complex, b: Complex): Complex => {
    const denom = b.re * b.re + b.im * b.im
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom,
    }
  },
  parse: (val: number | string | Complex): Complex => {
    if (typeof val === 'object') return val
    if (typeof val === 'number') return { re: val, im: 0 }
    const v = val.replace(/\s+/g, '')
    if (v === 'i') return { re: 0, im: 1 }
    if (v === '-i') return { re: 0, im: -1 }
    if (v.includes('sqrt(2)')) {
      const base = 1 / Math.sqrt(2)
      return { re: (v.startsWith('-') ? -1 : 1) * base, im: 0 }
    }
    if (v.includes('e^(iπ/4)') || v.includes('exp(ipi/4)')) {
      const angle = Math.PI / 4
      return { re: Math.cos(angle), im: Math.sin(angle) }
    }
    return { re: 0, im: 0 }
  },
  toString: (c: Complex) => `${c.re.toFixed(2)}${c.im >= 0 ? '+' : ''}${c.im.toFixed(2)}i`,
}

export type Vector = Complex[]
export type Matrix = Complex[][]

export const LinAlg = {
  eye: (size: number): Matrix => {
    const m: Matrix = []
    for (let r = 0; r < size; r++) {
      const row: Vector = []
      for (let c = 0; c < size; c++) row.push(r === c ? C.one : C.zero)
      m.push(row)
    }
    return m
  },

  apply: (M: Matrix, v: Vector): Vector => {
    const size = M.length
    if (v.length !== size) throw new Error('Dimension mismatch')
    return M.map((row) => row.reduce((acc, cell, i) => C.add(acc, C.mul(cell, v[i])), C.zero))
  },

  tensorVec: (a: Vector, b: Vector): Vector => {
    const res: Vector = []
    for (const ca of a) for (const cb of b) res.push(C.mul(ca, cb))
    return res
  },

  tensorMat: (A: Matrix, B: Matrix): Matrix => {
    const rA = A.length
    const cA = A[0].length
    const rB = B.length
    const cB = B[0].length
    const res: Matrix = new Array(rA * rB)
    for (let i = 0; i < rA * rB; i++) res[i] = new Array(cA * cB)
    for (let r = 0; r < rA; r++) {
      for (let c = 0; c < cA; c++) {
        for (let i = 0; i < rB; i++) {
          for (let j = 0; j < cB; j++) {
            res[r * rB + i][c * cB + j] = C.mul(A[r][c], B[i][j])
          }
        }
      }
    }
    return res
  },

  parseMatrix: (raw: (number | string)[][]): Matrix => raw.map((row) => row.map((cell) => C.parse(cell))),
}

let sysCounter = 1

export class QuantumSystem {
  id: string
  vector: Vector
  qubitCount: number

  constructor(vector?: Vector) {
    this.id = `sys_${sysCounter++}`
    this.vector = vector || [{ re: 1, im: 0 }, { re: 0, im: 0 }]
    this.qubitCount = Math.log2(this.vector.length)
  }

  merge(other: QuantumSystem): void {
    if (this.id === other.id) return
    this.vector = LinAlg.tensorVec(this.vector, other.vector)
    this.qubitCount += other.qubitCount
  }

  applyGate(matrixRaw: (number | string)[][], targetQubitIndex: number) {
    const G = LinAlg.parseMatrix(matrixRaw)
    const gateSize = Math.log2(G.length) // 1 for single-qubit, 2 for two-qubit

    if (this.qubitCount === 1) {
      this.vector = LinAlg.apply(G, this.vector)
      return
    }

    // Build full operator: I_pre ⊗ G ⊗ I_post
    const preSize = Math.pow(2, targetQubitIndex)
    const postSize = Math.pow(2, this.qubitCount - targetQubitIndex - gateSize)
    let full = LinAlg.tensorMat(LinAlg.eye(preSize), G)
    full = LinAlg.tensorMat(full, LinAlg.eye(postSize))
    this.vector = LinAlg.apply(full, this.vector)
  }

  measure(): number {
    let r = Math.random()
    let cumulative = 0
    for (let i = 0; i < this.vector.length; i++) {
      const prob = C.abs2(this.vector[i])
      cumulative += prob
      if (r < cumulative) return i
    }
    return this.vector.length - 1
  }

  getExcitationProbability(): number {
    let sum = 0
    for (let i = 0; i < this.vector.length; i++) {
      if ((i & 1) === 1) sum += C.abs2(this.vector[i])
    }
    return sum
  }
}

export type Qubit = QuantumSystem

export function applyGate(qubit: Qubit, matrix: (number | string)[][]): Qubit {
  qubit.applyGate(matrix, 0)
  return qubit
}

export function measure(qubit: Qubit): '0' | '1' {
  const result = qubit.measure()
  return result === 1 ? '1' : '0'
}
