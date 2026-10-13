import { z } from 'zod'
import { localDate } from './utils'

export const spaceCodes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as const
export type SpaceCode = typeof spaceCodes[number]
export type Occupancy = 'FREE' | 'OCCUPIED' | 'UNKNOWN'
export type SpaceStatus = 'free' | 'occupied' | 'reserved' | 'unknown'
export type Space = { id: SpaceCode; occupancy: Occupancy; updatedAt: string; sequence?: number }
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
export function validateBooking(input: BookingInput, spaces: Space[], reservations: Reservation[], now = new Date()): string | null {
  const start = new Date(`${input.date}T${input.from}`)
  const end = new Date(`${input.date}T${input.to}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.from) || !/^\d{2}:\d{2}$/.test(input.to) || !Number.isFinite(+start) || !Number.isFinite(+end) || localDate(start) !== input.date) return 'Introduce una fecha y un horario válidos.'
  if (start < now) return 'La llegada debe ser posterior a la hora actual.'
  if (end <= start) return 'La salida debe ser posterior a la llegada.'
  const space = spaces.find(s => s.id === input.space)
  if (!space || space.occupancy !== 'FREE') return 'Esta plaza ya no está disponible. Elige otra.'
  if (reservations.some(r => r.space === input.space && r.status === 'active' && start < new Date(`${r.date}T${r.to}`) && end > new Date(`${r.date}T${r.from}`))) return 'Ya existe una reserva para esta plaza en ese horario.'
  return null
}
export function payDemoTicket(state: DemoState, ticket: string, method: 'wallet' | 'qr'): DemoState {
  if (state.paidTickets.includes(ticket)) return state
  if (method === 'wallet' && state.balance < 10) throw new Error('Saldo insuficiente. Recarga tu billetera o elige el QR de prueba.')
  return { ...state, balance: state.balance - (method === 'wallet' ? 10 : 0), paidTickets: [...state.paidTickets, ticket],
    movements: [{ id: crypto.randomUUID(), title: `Pago ${ticket} · ${method === 'wallet' ? 'billetera' : 'QR externo'}`, amount: -10, unit: 'Bs', date: new Date().toISOString() }, ...state.movements] }
}
