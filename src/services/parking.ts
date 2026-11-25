import { spaceCodes, type Occupancy, type Space, type SpaceCode } from '@/lib/model'

export const isDemo = import.meta.env.VITE_DATA_MODE !== 'live'
// La ocupación física puede ser real aunque billetera, reservas y pagos sigan en demo.
export const isLiveOccupancy = (import.meta.env.VITE_OCCUPANCY_MODE ?? (isDemo ? 'demo' : 'live')) === 'live'
const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
// Mismo origen por defecto: Vite reenvía el upgrade WebSocket a NestJS.
export function resolveSocketOrigin(configured:string,pageOrigin:string):string {
  const page=new URL(pageOrigin),target=new URL(configured||pageOrigin,pageOrigin)
  const loopback=(host:string)=>['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(host)
  // En un móvil, localhost apunta al propio teléfono, nunca al PC que ejecuta Vite.
  return loopback(target.hostname)&&!loopback(page.hostname)?page.origin:target.origin
}
export function parkingSocketUrl(): string {
  return resolveSocketOrigin(import.meta.env.VITE_SOCKET_URL || apiUrl,window.location.origin)
}
export const pollingIntervalMs = Math.max(1000, Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000)
const staleAfterMs = Math.max(60000, Number(import.meta.env.VITE_STALE_AFTER_MS) || 90000)
export function unknownSpaces(): Space[] { return spaceCodes.map(id => ({ id, occupancy: 'UNKNOWN', updatedAt: '' })) }
const obj = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
export function parseSpace(value: unknown, now = Date.now()): Space | null {
  const row = obj(value)
  const code = String(row.code ?? row.codigo ?? row.spaceId ?? row.id ?? '').toUpperCase()
  if (!spaceCodes.includes(code as SpaceCode)) return null
  const raw = String(row.estadoFisico ?? row.physicalOccupancy ?? row.occupancyStatus ?? row.occupancy_status ?? row.status ?? row.estado ?? '').toUpperCase()
  const lastReading = Date.parse(String(row.ultimaLectura ?? ''))
  const staleAt = row.sensorCodigo ? (Number.isFinite(lastReading) ? lastReading + staleAfterMs : 0) : undefined
  const sensorIsStale = staleAt !== undefined && now > staleAt
  // Un estacionamiento deshabilitado nunca debe anunciarse como disponible.
  const occupancy: Occupancy = row.activo === false ? 'UNKNOWN' :
    ['FREE', 'LIBRE'].includes(raw) ? 'FREE' :
    ['OCCUPIED', 'OCUPADO'].includes(raw) ? 'OCCUPIED' : 'UNKNOWN'
  const time = String(row.updatedAt ?? row.updated_at ?? row.ultimaLectura ?? row.fechaCambio ?? row.timestamp ?? '')
  return { id: code as SpaceCode, occupancy, updatedAt: Number.isFinite(Date.parse(time)) ? time : '', isStale: sensorIsStale, staleAt, sequence: typeof row.sequence === 'number' ? row.sequence : undefined }
}
export function parseSnapshot(value: unknown, now = Date.now()): Space[] {
  const data = obj(value)
  const rows = Array.isArray(value) ? value : data.plazas ?? data.spaces ?? data.data
  if (!Array.isArray(rows)) throw new Error('La respuesta no contiene una lista de plazas.')
  const parsed = rows.map(row => parseSpace(row, now)).filter((s): s is Space => s !== null)
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
// Evitar /api/api si se configura el prefijo tanto en base como en path.
export function spacesEndpoint(base: string, path: string): string {
  const b=base.replace(/\/$/,'')
  const p='/'+path.replace(/^\/+|\/+$/g,'')
  return b.endsWith('/api')&&p.startsWith('/api/')?b+p.slice(4):b+p
}
export async function getSpaces(signal?: AbortSignal): Promise<{spaces:Space[];serverMs:number;receivedAt:number}> {
  // El endpoint consolidado contiene el reloj de NestJS y la lectura física.
  const path=spacesEndpoint(apiUrl,import.meta.env.VITE_SPACES_PATH || '/api/estacionamientos')
  const url=path.endsWith('/disponibilidad')?path:path+'/disponibilidad'
  const response=await fetch(url,{signal,cache:'no-store',headers:{Accept:'application/json'}})
  if(!response.ok)throw new Error(`No se pudo consultar la disponibilidad (${response.status}).`)
  const value=await response.json()
  const serverMs=Date.parse(String(obj(value).servidorAhora??''))
  if(!Number.isFinite(serverMs))throw new Error('No se recibió el reloj del servidor.')
  return {spaces:parseSnapshot(value,serverMs),serverMs,receivedAt:performance.now()}
}

/** Actualiza la antigüedad sin consultar al servidor ni perder el último estado. */
export function refreshSpaceFreshness(spaces: Space[], now = Date.now()): Space[] {
  let changed = false
  const next = spaces.map(space => {
    if (space.staleAt === undefined) return space
    const isStale = now > space.staleAt
    if (space.isStale === isStale) return space
    changed = true
    return { ...space, isStale }
  })
  return changed ? next : spaces
}
