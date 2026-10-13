import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createDemo, demoSchema, displayStatus, payDemoTicket, reservationStatus, spaceCodes, validateBooking, type BookingInput, type DemoState, type Space } from '@/lib/model'
import { isDemo, unknownSpaces } from '@/services/parking'
import { useParking } from '@/hooks/use-parking'

const STORAGE_KEY = 'parkingos:demo:v1'
function loadDemo() {
  try { const parsed = demoSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')); if (parsed.success) return parsed.data } catch { /* El modo privado puede bloquear almacenamiento. */ }
  return createDemo()
}
function useStore() {
  const [demo, setDemo] = useState(loadDemo)
  const current = useRef(demo)
  const [notice, setNotice] = useState('')
  const [simulatedOffline, setSimulatedOffline] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(new Date())
  const real = useParking()
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000)
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { clearInterval(timer); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(id) }, [notice])
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      const next = loadDemo(); current.current = next; setDemo(next)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  function update(fn: (previous: DemoState) => DemoState) {
    if (!isDemo) throw new Error('Esta función estará disponible después de integrar el servicio.')
    const next = fn(current.current)
    current.current = next; setDemo(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { setNotice('Los cambios duran esta sesión: el almacenamiento local no está disponible.') }
  }
  const confirmed = isDemo ? !simulatedOffline : online && real.connection === 'online'
  const spaces: Space[] = !confirmed ? unknownSpaces() : isDemo ? spaceCodes.map((id, i) => ({ id, occupancy: demo.occupancy[i], updatedAt: now.toISOString() })) : real.spaces
  const reservations = isDemo ? demo.reservations.map(r => ({ ...r, status: reservationStatus(r, now) })) : []
  const statusOf = (space: Space) => displayStatus(space, reservations, now)
  const stats = { free: 0, occupied: 0, reserved: 0, unknown: 0 }
  spaces.forEach(s => stats[statusOf(s)]++)
  function book(input: BookingInput) {
    const error = validateBooking(input, spaces, current.current.reservations)
    if (error) throw new Error(error)
    const id = `RS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    update(s => ({ ...s, reservations: [{ ...input, id, status: 'active' }, ...s.reservations] }))
    setNotice(`Reserva de prueba ${id} creada`)
    return id
  }
  return { demo, update, now, isDemo, spaces, reservations, statusOf, stats, confirmed, online, notice, setNotice,
    connectionMessage: isDemo ? simulatedOffline ? 'Simulación sin señal. Las plazas no están confirmadas.' : 'Datos de demostración' : real.message,
    reconnect: isDemo ? () => setSimulatedOffline(false) : real.reconnect,
    simulatedOffline, setSimulatedOffline, book,
    resetDemo: () => { update(() => createDemo()); setSimulatedOffline(false); setNotice('La demostración vuelve a empezar') },
    cancel: (id: string) => { update(s => ({ ...s, reservations: s.reservations.map(r => r.id === id ? { ...r, status: 'cancelled' } : r) })); setNotice('Reserva cancelada') },
    topUp: (amount: number, unit: 'Bs' | 'tokens') => {
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) throw new Error('Elige un importe entre 1 y 1.000.')
      update(s => ({ ...s, balance: s.balance + (unit === 'Bs' ? amount : 0), tokens: s.tokens + (unit === 'tokens' ? amount : 0), movements: [{ id: crypto.randomUUID(), title: unit === 'Bs' ? 'Recarga de demostración' : 'Tokens de demostración', amount, unit, date: new Date().toISOString() }, ...s.movements] }))
      setNotice('Recarga de prueba completada')
    },
    pay: (ticket: string, method: 'wallet' | 'qr') => update(s => payDemoTicket(s, ticket, method)),
  }
}
const Context = createContext<ReturnType<typeof useStore> | null>(null)
export function ParkingProvider({ children }: { children: ReactNode }) { const value = useStore(); return <Context.Provider value={value}>{children}</Context.Provider> }
export function useParkingStore() { const value = useContext(Context); if (!value) throw new Error('ParkingProvider no encontrado'); return value }
