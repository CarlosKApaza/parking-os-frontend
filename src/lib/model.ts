import { z } from 'zod'
import { localDate } from './utils'
import { DEMO_RATE_BS } from './pricing'

export const spaceCodes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as const
export type SpaceCode = typeof spaceCodes[number]
export type Occupancy = 'FREE' | 'OCCUPIED' | 'UNKNOWN'
export type SpaceStatus = 'free' | 'occupied' | 'reserved' | 'unknown'
// isStale informa sobre la antigüedad de la lectura, sin borrar el último estado guardado.
export type Space = { id: SpaceCode; occupancy: Occupancy; updatedAt: string; isStale?: boolean; staleAt?: number; sequence?: number }
const reservationSchema = z.object({
  id: z.string(), space: z.enum(spaceCodes), date: z.string(), from: z.string(), to: z.string(),
  status: z.enum(['active', 'completed', 'cancelled']),
})
export type Reservation = z.infer<typeof reservationSchema>
const movementSchema = z.object({ id: z.string(), title: z.string(), amount: z.number(), unit: z.enum(['Bs', 'tokens']), date: z.string() })
const vehicleSchema = z.object({ id: z.string(), plate: z.string(), model: z.string() })
export type Vehicle = z.infer<typeof vehicleSchema>
export const demoSchema = z.object({
  version: z.literal(1), balance: z.number().nonnegative(), tokens: z.number().nonnegative(), plus: z.boolean(),
  name: z.string(), vehicles: z.array(vehicleSchema), reservations: z.array(reservationSchema),
  movements: z.array(movementSchema), paidTickets: z.array(z.string()),
  occupancy: z.array(z.enum(['FREE', 'OCCUPIED', 'UNKNOWN'])).length(7),
})
export type DemoState = z.infer<typeof demoSchema>
export type BookingInput = Pick<Reservation, 'space' | 'date' | 'from' | 'to'>
export const statusLabels: Record<SpaceStatus, string> = { free: 'Libre', occupied: 'Ocupado', reserved: 'Reservado', unknown: 'Sin confirmar' }
const hm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
export function createDemo(): DemoState {
  const now = new Date()
  const start = new Date(now.getTime() - 15 * 60000)
  const end = new Date(now.getTime() + 90 * 60000)
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const active: Reservation[] = localDate(start) === localDate(end) ? [{ id: 'RS-1042', space: 'P4', date: localDate(now), from: hm(start), to: hm(end), status: 'active' }] : []
  return {
    version: 1, balance: 120, tokens: 8, plus: false, name: 'Alex', vehicles: [],
    occupancy: ['FREE', 'OCCUPIED', 'FREE', 'FREE', 'OCCUPIED', 'FREE', 'FREE'],
    reservations: [...active,
      { id: 'RS-1038', space: 'P1', date: localDate(yesterday), from: '09:00', to: '11:00', status: 'completed' },
      { id: 'RS-1035', space: 'P6', date: localDate(yesterday), from: '15:00', to: '16:00', status: 'cancelled' },
    ],
    movements: [{ id: 'MV-001', title: 'Saldo inicial de demostración', amount: 120, unit: 'Bs', date: now.toISOString() }], paidTickets: [],
  }
}
export function reservationStatus(r: Reservation, now = new Date()): Reservation['status'] {
  return r.status === 'active' && new Date(`${r.date}T${r.to}`) <= now ? 'completed' : r.status
}
export function displayStatus(space: Space, reservations: Reservation[], now = new Date()): SpaceStatus {
  if (space.occupancy === 'UNKNOWN') return 'unknown'
  if (space.occupancy === 'OCCUPIED') return 'occupied'
  return reservations.some(r => r.space === space.id && r.status === 'active' && new Date(`${r.date}T${r.from}`) <= now && now < new Date(`${r.date}T${r.to}`)) ? 'reserved' : 'free'
}
export function validateBooking(input: BookingInput, spaces: Space[], reservations: Reservation[], now = new Date(), allowStaleDemo = false): string | null {
  const start = new Date(`${input.date}T${input.from}`)
  const end = new Date(`${input.date}T${input.to}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.from) || !/^\d{2}:\d{2}$/.test(input.to) || !Number.isFinite(+start) || !Number.isFinite(+end) || localDate(start) !== input.date) return 'Introduce una fecha y un horario válidos.'
  if (start < now) return 'La llegada debe ser posterior a la hora actual.'
  if (end <= start) return 'La salida debe ser posterior a la llegada.'
  const space = spaces.find(s => s.id === input.space)
  if (!space || space.occupancy !== 'FREE') return 'Esta plaza ya no está disponible. Elige otra.'
  if (space.isStale && !allowStaleDemo) return 'La última lectura del sensor es antigua. Espera una lectura nueva antes de reservar.'
  if (reservations.some(r => r.space === input.space && r.status === 'active' && start < new Date(`${r.date}T${r.to}`) && end > new Date(`${r.date}T${r.from}`))) return 'Ya existe una reserva para esta plaza en ese horario.'
  return null
}
// Tickets de salida ficticios: cobro proporcional por minutos (solo demo).
// No altera la regla por horas de las reservas ni autoriza una barrera.
export const demoExitTickets = [
  { id: 'DEMO-0042', minutes: 90, place: 'Maqueta física' },
  { id: 'DEMO-0041', minutes: 60, place: 'Planta única' },
  { id: 'DEMO-0040', minutes: 60, place: 'Planta única' },
].map(ticket => ({ ...ticket, rate: DEMO_RATE_BS, total: Math.round(ticket.minutes / 60 * DEMO_RATE_BS * 100) / 100 }))

export type DemoPayment = { id: string; ticket: string; amount: number; date: string; method: 'wallet' | 'qr'; place: string }

// Los movimientos ya se persisten en localStorage. Derivamos el historial sin
// duplicar datos ni cambiar el esquema v1; conservamos importes antiguos.
export function demoPaymentHistory(state: DemoState): DemoPayment[] {
  const seen = new Set<string>()
  const payments: DemoPayment[] = []
  for (const movement of state.movements) {
    const match = /^Pago (DEMO-\d+) · (billetera|QR externo)$/.exec(movement.title)
    if (!match || movement.unit !== 'Bs' || movement.amount >= 0 || !state.paidTickets.includes(match[1]) || seen.has(match[1])) continue
    seen.add(match[1])
    payments.push({ id: movement.id, ticket: match[1], amount: -movement.amount, date: movement.date,
      method: match[2] === 'billetera' ? 'wallet' : 'qr',
      place: demoExitTickets.find(t => t.id === match[1])?.place ?? 'Estacionamiento principal' })
  }
  return payments.sort((a,b) => Date.parse(b.date) - Date.parse(a.date))
}
export function payDemoTicket(state: DemoState, ticket: string, method: 'wallet' | 'qr'): DemoState {
  if (state.paidTickets.includes(ticket)) return state
  const quote = demoExitTickets.find(t => t.id === ticket)
  if (!quote) throw new Error('Ticket de prueba no encontrado.')
  if (method === 'wallet' && state.balance < quote.total) throw new Error('Saldo insuficiente. Recarga tu billetera o elige el QR de prueba.')
  return { ...state, balance: state.balance - (method === 'wallet' ? quote.total : 0), paidTickets: [...state.paidTickets, ticket],
    movements: [{ id: crypto.randomUUID(), title: `Pago ${ticket} · ${method === 'wallet' ? 'billetera' : 'QR externo'}`, amount: -quote.total, unit: 'Bs', date: new Date().toISOString() }, ...state.movements] }
}
