import { useEffect, useRef, useState } from 'react'
import { spaceCodes, type SpaceCode } from '@/lib/model'

// Retención exclusivamente demostrativa entre pestañas del mismo navegador.
// No bloquea plazas entre dispositivos: requiere un servicio de reservas en NestJS.
const STORAGE_KEY = 'parkingos:holds-demo:v1'
export const HOLD_DURATION_MS = 30_000
type Hold = { owner: string; expiresAt: number }
type HoldMap = Partial<Record<SpaceCode, Hold>>

function readHolds(now = Date.now()): HoldMap {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const entries = raw as Record<string, unknown>
    const result: HoldMap = {}
    for (const code of spaceCodes) {
      const item = entries[code]
      if (!item || typeof item !== 'object') continue
      const hold = item as Record<string, unknown>
      if (typeof hold.owner === 'string' && typeof hold.expiresAt === 'number' && hold.expiresAt > now) {
        result[code] = { owner: hold.owner, expiresAt: hold.expiresAt }
      }
    }
    return result
  } catch {
    return {}
  }
}

function persistHolds(value: HoldMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* Modo privado: solo sesión actual */ }
}

export function useSpaceHold() {
  const owner = useRef('tab-' + Date.now() + '-' + Math.random().toString(36).slice(2))
  const [holds, setHolds] = useState<HoldMap>(() => readHolds())
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const sync = () => {
      const time = Date.now()
      setNow(time)
      setHolds(readHolds(time))
    }
    const timer = window.setInterval(sync, 350)
    window.addEventListener('storage', sync)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', sync)
      const remainingHolds = readHolds()
      let changed = false
      for (const code of spaceCodes) {
        if (remainingHolds[code]?.owner === owner.current) {
          delete remainingHolds[code]
          changed = true
        }
      }
      if (changed) persistHolds(remainingHolds)
    }
  }, [])

  function take(code: SpaceCode): boolean {
    const time = Date.now()
    const next = readHolds(time)
    const existing = next[code]
    if (existing && existing.owner !== owner.current) return false
    for (const key of spaceCodes) {
      if (next[key]?.owner === owner.current) delete next[key]
    }
    next[code] = { owner: owner.current, expiresAt: time + HOLD_DURATION_MS }
    persistHolds(next)
    setHolds(next)
    setNow(time)
    return true
  }

  function release(code: SpaceCode) {
    const next = readHolds()
    if (next[code]?.owner === owner.current) {
      delete next[code]
      persistHolds(next)
      setHolds(next)
    }
  }

  function remaining(code: SpaceCode | null): number {
    return code && holds[code] ? Math.max(0, Math.ceil((holds[code].expiresAt - now) / 1000)) : 0
  }

  function ownerOf(code: SpaceCode): 'me' | 'other' | null {
    const hold = holds[code]
    if (!hold || hold.expiresAt <= now) return null
    return hold.owner === owner.current ? 'me' : 'other'
  }

  return { take, release, remaining, ownerOf }
}
