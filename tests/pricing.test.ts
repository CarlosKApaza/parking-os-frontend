import { describe, expect, it } from 'vitest'
import { quoteParking } from '../src/lib/pricing'

describe('cotización referencial de estacionamiento', () => {
  it('cobra por horas completas en la demo', () => {
    expect(quoteParking('2026-11-24', '09:00', '11:00', 5)).toEqual({ hours: 2, total: 10 })
  })
  it('redondea una fracción a la siguiente hora', () => {
    expect(quoteParking('2026-11-24', '09:00', '09:30', 5)).toEqual({ hours: 1, total: 5 })
  })
  it('no genera cargos con horarios invertidos', () => {
    expect(quoteParking('2026-11-24', '12:00', '10:00', 5)).toEqual({ hours: 0, total: 0 })
  })
})
