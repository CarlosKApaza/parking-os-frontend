import { describe, expect, it } from 'vitest'
import { createDemo, displayStatus, payDemoTicket, reservationStatus, validateBooking, type Reservation, type Space } from '../src/lib/model'
import { mergeSpace, parseSnapshot, parseSpace } from '../src/services/parking'

const space: Space = { id: 'P1', occupancy: 'FREE', updatedAt: '2026-10-11T10:00:00Z', sequence: 5 }
const now = new Date('2026-10-11T09:00:00')
const reservation: Reservation = { id: 'RS-1', space: 'P1', date: '2026-10-11', from: '10:00', to: '11:00', status: 'active' }
const booking = { space: 'P1' as const, date: '2026-10-11', from: '09:30', to: '10:30' }

describe('disponibilidad y reservas', () => {
  it('no confunde una reserva futura con ocupación física', () => expect(displayStatus(space, [reservation], now)).toBe('free'))
  it('muestra una reserva dentro de su franja', () => expect(displayStatus(space, [reservation], new Date('2026-10-11T10:30:00'))).toBe('reserved'))
  it('prioriza el sensor cuando hay ocupación real', () => expect(displayStatus({ ...space, occupancy: 'OCCUPIED' }, [reservation], now)).toBe('occupied'))
  it('nunca muestra una plaza sin confirmar como libre', () => expect(displayStatus({ ...space, occupancy: 'UNKNOWN' }, [], now)).toBe('unknown'))
  it('rechaza reservas superpuestas', () => expect(validateBooking(booking, [space], [reservation], now)).toContain('Ya existe'))
  it('permite horarios contiguos', () => expect(validateBooking({ ...booking, from: '11:00', to: '12:00' }, [space], [reservation], now)).toBeNull())
  it('rechaza fechas pasadas', () => expect(validateBooking({ ...booking, date: '2026-10-10' }, [space], [], now)).toContain('posterior'))
  it('rechaza fechas inexistentes', () => expect(validateBooking({ ...booking, date: '2026-02-31' }, [space], [], now)).toContain('válidos'))
  it('rechaza salida anterior a entrada', () => expect(validateBooking({ ...booking, from: '12:00', to: '10:00' }, [space], [], now)).toContain('salida'))
  it('vuelve a comprobar el sensor al confirmar', () => expect(validateBooking(booking, [{ ...space, occupancy: 'OCCUPIED' }], [], now)).toContain('ya no'))
  it('ignora reservas canceladas al verificar conflictos', () => expect(validateBooking(booking, [space], [{ ...reservation, status: 'cancelled' }], now)).toBeNull())
  it('finaliza reservas vencidas sin alterar las canceladas', () => {
    const late = new Date('2026-10-11T12:00:00')
    expect(reservationStatus(reservation, late)).toBe('completed')
    expect(reservationStatus({ ...reservation, status: 'cancelled' }, late)).toBe('cancelled')
  })
})
describe('contrato de lectura REST y Socket.IO', () => {
  it('normaliza respuestas y mantiene 7 plazas', () => {
    const result = parseSnapshot({ spaces: [{ code: 'P1', occupancy_status: 'FREE' }] })
    expect(result).toHaveLength(7)
    expect(result[0].occupancy).toBe('FREE')
    expect(result[1].occupancy).toBe('UNKNOWN')
  })
  it('rechaza respuestas malformadas', () => expect(() => parseSnapshot({ message: 'Hello World' })).toThrow())
  it('ignora plazas ajenas y estados no reconocidos', () => {
    expect(parseSpace({ id: 'P8', status: 'FREE' })).toBeNull()
    expect(parseSpace({ id: 'P1', status: 'RESERVED' })?.occupancy).toBe('UNKNOWN')
  })
  it('descarta eventos duplicados o fuera de orden', () => {
    expect(mergeSpace([space], { ...space, occupancy: 'OCCUPIED', sequence: 4 })[0].occupancy).toBe('FREE')
    expect(mergeSpace([space], { ...space, occupancy: 'OCCUPIED', sequence: 5 })[0].occupancy).toBe('FREE')
    expect(mergeSpace([space], { ...space, occupancy: 'OCCUPIED', sequence: 6 })[0].occupancy).toBe('OCCUPIED')
  })
  it('descarta timestamps atrasados', () => expect(mergeSpace([space], { ...space, sequence: undefined, occupancy: 'OCCUPIED', updatedAt: '2026-10-10T10:00:00Z' })[0].occupancy).toBe('FREE'))
})
describe('pagos de demostración', () => {
  it('no descuenta dos veces el mismo ticket', () => {
    const state = createDemo()
    const paid = payDemoTicket(state, 'DEMO-0042', 'wallet')
    expect(paid.balance).toBe(110)
    expect(payDemoTicket(paid, 'DEMO-0042', 'wallet')).toBe(paid)
  })
  it('no permite saldo negativo', () => expect(() => payDemoTicket({ ...createDemo(), balance: 5 }, 'DEMO-0042', 'wallet')).toThrow('Saldo insuficiente'))
  it('el pago QR externo no descuenta la billetera', () => {
    const paid = payDemoTicket(createDemo(), 'DEMO-0042', 'qr')
    expect(paid.balance).toBe(120)
    expect(paid.paidTickets).toContain('DEMO-0042')
  })
})
