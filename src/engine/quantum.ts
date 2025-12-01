// --- 1. Complex Number Engine ---

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
      const sign = v.startsWith('-') ? -1 : 1
      if (v.includes('i')) return { re: 0, im: sign * base }
      return { re: sign * base, im: 0 }
    }

    if (v.includes('e^(iπ/4)') || v.includes('exp(ipi/4)')) {
      const angle = Math.PI / 4
      return { re: Math.cos(angle), im: Math.sin(angle) }
    }

    return { re: 0, im: 0 }
  },
  toString: (c: Complex) => {
    if (Math.abs(c.im) < 0.0001) return c.re.toFixed(3)
    if (Math.abs(c.re) < 0.0001) return `${c.im.toFixed(3)}i`
    return `${c.re.toFixed(3)}${c.im >= 0 ? '+' : ''}${c.im.toFixed(3)}i`
  },
}

// --- 2. Linear Algebra (Matrices & Vectors) ---

export type Vector = Complex[]
export type Matrix = Complex[][]

export const LinAlg = {
  apply: (M: Matrix, v: Vector): Vector => {
    const size = M.length
    if (v.length !== size) throw new Error(`Dimension mismatch: M is ${size}x${size}, v is ${v.length}`)
    const result: Vector = new Array(size)
    for (let r = 0; r < size; r++) {
      let sum = C.zero
      for (let c = 0; c < size; c++) {
        sum = C.add(sum, C.mul(M[r][c], v[c]))
      }
      result[r] = sum
    }
    return result
  },

  tensorVec: (a: Vector, b: Vector): Vector => {
    const res: Vector = []
    for (const ca of a) {
      for (const cb of b) {
        res.push(C.mul(ca, cb))
      }
    }
    return res
  },

  parseMatrix: (raw: (number | string)[][]): Matrix => raw.map((row) => row.map((cell) => C.parse(cell))),
}

// --- 3. Quantum System Logic ---

export class QuantumState {
  vector: Vector

  constructor(vector?: Vector) {
    this.vector = vector || [{ re: 1, im: 0 }, { re: 0, im: 0 }]
  }

  get size() {
    return this.vector.length
  }

  apply(gateRaw: (number | string)[][]) {
    const matrix = LinAlg.parseMatrix(gateRaw)
    this.vector = LinAlg.apply(matrix, this.vector)
  }

  merge(other: QuantumState): QuantumState {
    const newVec = LinAlg.tensorVec(this.vector, other.vector)
    return new QuantumState(newVec)
  }

  measure(): number {
    let r = Math.random()
    let cumulative = 0
    for (let i = 0; i < this.vector.length; i++) {
      const prob = C.abs2(this.vector[i])
      cumulative += prob
      if (r < cumulative) {
        return i
      }
    }
    return this.vector.length - 1
  }

  getExcitationProbability(): number {
    let sum = 0
    for (let i = 0; i < this.vector.length; i++) {
      if ((i & 1) === 1) {
        sum += C.abs2(this.vector[i])
      }
    }
    return sum
  }
}

// --- Compatibility Helpers ---

export type Qubit = QuantumState

export function applyGate(qubit: Qubit, matrix: (number | string)[][]): Qubit {
  qubit.apply(matrix)
  return qubit
}

export function measure(qubit: Qubit): '0' | '1' {
  const result = qubit.measure()
  return result === 1 ? '1' : '0'
}
