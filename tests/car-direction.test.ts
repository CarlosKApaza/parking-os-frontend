import { describe, expect, it } from 'vitest'
import { carDirection } from '../src/lib/car-direction'
import { spaceCodes } from '../src/lib/model'

describe('orientacion de coches en el plano 2D', () => {
  it('P1-P4 miran a la derecha, hacia el pasillo central', () => {
    for (const space of ['P1','P2','P3','P4'] as const) {
      expect(carDirection(space)).toBe('right')
    }
  })
  it('P5-P7 miran a la izquierda, hacia el pasillo central', () => {
    for (const space of ['P5','P6','P7'] as const) {
      expect(carDirection(space)).toBe('left')
    }
  })
  it('contempla las siete plazas', () => expect(spaceCodes).toHaveLength(7))
})
