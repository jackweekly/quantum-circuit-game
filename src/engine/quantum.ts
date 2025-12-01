export interface Complex {
  re: number
  im: number
}

export const C = {
  zero: { re: 0, im: 0 } as Complex,
  one: { re: 1, im: 0 } as Complex,
  add: (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im }),
  mul: (a: Complex, b: Complex): Complex => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  }),
  abs2: (a: Complex): number => a.re * a.re + a.im * a.im,
  parse: (val: number | string): Complex => {
    if (typeof val === 'number') return { re: val, im: 0 }
    if (val === 'i') return { re: 0, im: 1 }
    if (val === '-i') return { re: 0, im: -1 }
    if (val.includes('sqrt(2)')) {
      const sign = val.startsWith('-') ? -1 : 1
      return { re: sign * 0.707106, im: 0 }
    }
    if (val.includes('e^(iπ/4)')) {
      // Roughly cos(pi/4) + i sin(pi/4)
      const v = 0.707106
      return { re: v, im: v }
    }
    return { re: 0, im: 0 }
  },
}

export interface Qubit {
  alpha: Complex
  beta: Complex
}

export function applyGate(qubit: Qubit, matrix: (number | string)[][]): Qubit {
  const m00 = C.parse(matrix[0][0])
  const m01 = C.parse(matrix[0][1])
  const m10 = C.parse(matrix[1][0])
  const m11 = C.parse(matrix[1][1])

  const newAlpha = C.add(C.mul(m00, qubit.alpha), C.mul(m01, qubit.beta))
  const newBeta = C.add(C.mul(m10, qubit.alpha), C.mul(m11, qubit.beta))

  return { alpha: newAlpha, beta: newBeta }
}

export function measure(qubit: Qubit): '0' | '1' {
  const prob0 = C.abs2(qubit.alpha)
  return Math.random() < prob0 ? '0' : '1'
}
