import { spaceCodes, type Occupancy, type Space, type SpaceCode } from '@/lib/model'

export const isDemo = import.meta.env.VITE_DATA_MODE !== 'live'
// La ocupación física puede ser real aunque billetera, reservas y pagos sigan en demo.
export const isLiveOccupancy = (import.meta.env.VITE_OCCUPANCY_MODE ?? (isDemo ? 'demo' : 'live')) === 'live'
const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export const pollingIntervalMs = Math.max(1000, Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000)
const staleAfterMs = Math.max(60000, Number(import.meta.env.VITE_STALE_AFTER_MS) || 90000)
export function unknownSpaces(): Space[] { return spaceCodes.map(id => ({ id, occupancy: 'UNKNOWN', updatedAt: '' })) }
const obj = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
export function parseSpace(value: unknown): Space | null {
  const row = obj(value)
  const code = String(row.code ?? row.codigo ?? row.spaceId ?? row.id ?? '').toUpperCase()
  if (!spaceCodes.includes(code as SpaceCode)) return null
  const raw = String(row.physicalOccupancy ?? row.occupancyStatus ?? row.occupancy_status ?? row.status ?? row.estado ?? '').toUpperCase()
  const lastReading = Date.parse(String(row.ultimaLectura ?? ''))
  const sensorIsStale = Boolean(row.sensorCodigo) && (!Number.isFinite(lastReading) || Date.now() - lastReading > staleAfterMs)
  // Un estacionamiento deshabilitado nunca debe anunciarse como disponible.
  const occupancy: Occupancy = row.activo === false || sensorIsStale ? 'UNKNOWN' :
    ['FREE', 'LIBRE'].includes(raw) ? 'FREE' :
    ['OCCUPIED', 'OCUPADO'].includes(raw) ? 'OCCUPIED' : 'UNKNOWN'
  const time = String(row.updatedAt ?? row.updated_at ?? row.ultimaLectura ?? row.fechaCambio ?? row.timestamp ?? '')
  return { id: code as SpaceCode, occupancy, updatedAt: Number.isFinite(Date.parse(time)) ? time : '', sequence: typeof row.sequence === 'number' ? row.sequence : undefined }
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
  const response = await fetch(`${apiUrl}${import.meta.env.VITE_SPACES_PATH || '/api/estacionamientos'}`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`No se pudo consultar la disponibilidad (${response.status}).`)
  return parseSnapshot(await response.json())
}
