import { spaceCodes, type Occupancy, type Space, type SpaceCode } from '@/lib/model'

export const isDemo = import.meta.env.VITE_DATA_MODE !== 'live'
const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
export const realtimeConfig = {
  url: import.meta.env.VITE_SOCKET_URL || apiUrl,
  path: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
  event: import.meta.env.VITE_PARKING_EVENT || 'parking.updated',
  deviceEvent: import.meta.env.VITE_DEVICE_EVENT || 'device.status',
  staleAfter: Math.max(5000, Number(import.meta.env.VITE_STALE_AFTER_MS) || 30000),
}
export function unknownSpaces(): Space[] { return spaceCodes.map(id => ({ id, occupancy: 'UNKNOWN', updatedAt: '' })) }
const obj = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
export function parseSpace(value: unknown): Space | null {
  const row = obj(value)
  const code = String(row.code ?? row.spaceId ?? row.id ?? '').toUpperCase()
  if (!spaceCodes.includes(code as SpaceCode)) return null
  const raw = String(row.physicalOccupancy ?? row.occupancyStatus ?? row.occupancy_status ?? row.status ?? '').toUpperCase()
  const occupancy: Occupancy = raw === 'FREE' ? 'FREE' : raw === 'OCCUPIED' ? 'OCCUPIED' : 'UNKNOWN'
  const time = String(row.updatedAt ?? row.updated_at ?? row.timestamp ?? '')
  return { id: code as SpaceCode, occupancy, updatedAt: Number.isFinite(Date.parse(time)) ? time : new Date().toISOString(), sequence: typeof row.sequence === 'number' ? row.sequence : undefined }
}
export function parseSnapshot(value: unknown): Space[] {
  const data = obj(value)
  const rows = Array.isArray(value) ? value : data.spaces ?? data.data
  if (!Array.isArray(rows)) throw new Error('La respuesta no contiene una lista de plazas.')
  const parsed = rows.map(parseSpace).filter((s): s is Space => s !== null)
  if (!parsed.length) throw new Error('No se recibieron plazas P1–P7 válidas.')
  return unknownSpaces().map(s => parsed.find(p => p.id === s.id) ?? s)
}
export function mergeSpace(current: Space[], incoming: Space): Space[] {
  return current.map(s => {
    if (s.id !== incoming.id) return s
    if (incoming.sequence !== undefined && s.sequence !== undefined && incoming.sequence <= s.sequence) return s
    if (Date.parse(incoming.updatedAt) < Date.parse(s.updatedAt)) return s
    return incoming
  })
}
export async function getSpaces(signal?: AbortSignal): Promise<Space[]> {
  const response = await fetch(`${apiUrl}${import.meta.env.VITE_SPACES_PATH || '/api/spaces'}`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`No se pudo consultar la disponibilidad (${response.status}).`)
  return parseSnapshot(await response.json())
}
