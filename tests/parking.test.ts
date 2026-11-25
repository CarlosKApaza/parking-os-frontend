import { describe, expect, it } from 'vitest'
import { createDemo, demoPaymentHistory, displayStatus, payDemoTicket, reservationStatus, validateBooking, type Reservation, type Space } from '../src/lib/model'
import { mergeSpace, parseSnapshot, parseSpace, refreshSpaceFreshness, spacesEndpoint } from '../src/services/parking'

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
  it('no permite reservar una plaza libre con lectura antigua', () => expect(validateBooking(booking, [{ ...space, isStale: true }], [], now)).toContain('antigua'))
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
  it('adapta los campos y estados reales de NestJS + Prisma', () => {
    const result = parseSnapshot([
      { codigo: 'P1', estado: 'LIBRE', activo: true, sensorCodigo: 'IR01', ultimaLectura: new Date().toISOString() },
      { codigo: 'P2', estado: 'OCUPADO', activo: true },
      { codigo: 'P3', estado: 'DESCONOCIDO', activo: true },
    ])
    expect(result).toHaveLength(7)
    expect(result[0].occupancy).toBe('FREE')
    expect(result[1].occupancy).toBe('OCCUPIED')
    expect(result[2].occupancy).toBe('UNKNOWN')
  })
  it('nunca anuncia como libre un espacio deshabilitado', () => {
    expect(parseSpace({ codigo: 'P1', estado: 'LIBRE', activo: false })?.occupancy).toBe('UNKNOWN')
  })
  it('conserva el estado guardado, señalando por separado que la lectura es antigua', () => {
    const outdated = new Date(Date.now() - 120000).toISOString()
    expect(parseSpace({ codigo: 'P1', estado: 'LIBRE', sensorCodigo: 'IR01', ultimaLectura: outdated })).toMatchObject({ occupancy: 'FREE', isStale: true })
    expect(parseSpace({ codigo: 'P3', estado: 'OCUPADO', sensorCodigo: 'IR03', ultimaLectura: outdated })).toMatchObject({ occupancy: 'OCCUPIED', isStale: true })
    expect(parseSpace({ codigo: 'P4', estado: 'DESCONOCIDO', sensorCodigo: 'IR04', ultimaLectura: null })).toMatchObject({ occupancy: 'UNKNOWN', isStale: true })
  })
  it('reconoce una lectura reciente sin avisar de antigüedad', () => {
    expect(parseSpace({ codigo: 'P1', estado: 'LIBRE', sensorCodigo: 'IR01', ultimaLectura: new Date().toISOString() })?.isStale).toBe(false)
  })
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
    expect(paid.balance).toBe(112.5)
    expect(payDemoTicket(paid, 'DEMO-0042', 'wallet')).toBe(paid)
  })
  it('no permite saldo negativo', () => expect(() => payDemoTicket({ ...createDemo(), balance: 5 }, 'DEMO-0042', 'wallet')).toThrow('Saldo insuficiente'))
  it('el pago QR externo no descuenta la billetera', () => {
    const paid = payDemoTicket(createDemo(), 'DEMO-0042', 'qr')
    expect(paid.balance).toBe(120)
    expect(paid.paidTickets).toContain('DEMO-0042')
  })
})

describe('historial de pagos', () => {
  it('conserva importe, método, fecha y evita duplicados', () => {
    const state = payDemoTicket(createDemo(), 'DEMO-0042', 'wallet')
    const paid = payDemoTicket(state, 'DEMO-0041', 'qr')
    const history = demoPaymentHistory(payDemoTicket(paid, 'DEMO-0042', 'qr'))
    expect(history).toHaveLength(2)
    expect(history.find(p => p.ticket === 'DEMO-0042')).toMatchObject({ amount: 7.5, method: 'wallet' })
    expect(history.find(p => p.ticket === 'DEMO-0041')).toMatchObject({ amount: 5, method: 'qr' })
    expect(history.every(p => Number.isFinite(Date.parse(p.date)))).toBe(true)
    expect(paid.balance).toBe(112.5)
  })
  it('no mezcla recargas ni reservas con pagos', () => expect(demoPaymentHistory(createDemo())).toEqual([]))
  it('conserva los importes del historial anterior', () => {
    const state = payDemoTicket(createDemo(), 'DEMO-0042', 'qr')
    state.movements[0].amount = -10
    expect(demoPaymentHistory(state)[0].amount).toBe(10)
  })
  it('rechaza tickets desconocidos', () => expect(() => payDemoTicket(createDemo(), 'INVALIDO', 'qr')).toThrow('Ticket'))
})

describe('antigüedad de sensores sin polling', () => {
  it('marca la lectura antigua localmente y la recupera con un nuevo evento', () => {
    const at = Date.now()
    const incoming = parseSpace({codigo:'P1',sensorCodigo:'IR01',estado:'LIBRE',ultimaLectura:new Date(at).toISOString()})!
    expect(refreshSpaceFreshness([incoming], incoming.staleAt! + 1)[0]).toMatchObject({occupancy:'FREE',isStale:true})
    const fresh = parseSpace({codigo:'P1',sensorCodigo:'IR01',estado:'OCUPADO',ultimaLectura:new Date(at+1).toISOString()})!
    expect(mergeSpace([incoming],fresh)[0]).toMatchObject({occupancy:'OCCUPIED',isStale:false})
  })
  it('no cambia el arreglo si la antigüedad sigue igual', () => {
    const list = [{id:'P1',occupancy:'FREE',updatedAt:'',isStale:false,staleAt:Date.now()+90000}] as Space[]
    expect(refreshSpaceFreshness(list)).toBe(list)
  })
})

 describe('red local y reloj del servidor',()=>{
  it('no duplica el prefijo api',()=>{
    expect(spacesEndpoint('/api','/api/estacionamientos')).toBe('/api/estacionamientos')
    expect(spacesEndpoint('','/api/estacionamientos')).toBe('/api/estacionamientos')
  })
  it('lee disponibilidad consolidada con el tiempo de NestJS, no del móvil',()=>{
    const server=Date.parse('2026-11-25T13:20:26Z')
    const rows=parseSnapshot({plazas:[{codigo:'P1',estadoFisico:'LIBRE',sensorCodigo:'IR01',activo:true,ultimaLectura:'2026-11-25T13:20:00Z'}]},server)
    expect(rows[0]).toMatchObject({occupancy:'FREE',isStale:false})
    expect(refreshSpaceFreshness(rows,server+120000)[0].isStale).toBe(true)
  })
})
