import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getSpaces, isLiveOccupancy, mergeSpace, parkingSocketUrl, parseSpace, pollingIntervalMs, refreshSpaceFreshness, unknownSpaces } from '@/services/parking'
import type { Space } from '@/lib/model'

const EVENT = 'estacionamiento.actualizado'

// REST para estado inicial y recuperación; WebSocket para las lecturas vivas.
// El polling de 3 s queda exclusivamente como respaldo si no hay socket sano.
export function useParking() {
  const [spaces, setSpaces] = useState<Space[]>(unknownSpaces)
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [message, setMessage] = useState('Conectando con el estacionamiento…')
  const [retry, setRetry] = useState(0)
  const [socketConnected,setSocketConnected]=useState(false)
  const [reservationRevision,setReservationRevision]=useState(0)

  useEffect(() => {
    if (!isLiveOccupancy) return

    let disposed = false
    let current = unknownSpaces()
    let ready = false
    let generation = 0
    let controller: AbortController | null = null
    let pending = new Map<Space['id'], Space>()
    const socket = io(parkingSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      timeout: 5000,
    })

    setSpaces(current)
    setConnection('connecting')
    setMessage('Consultando disponibilidad real…')

    function publish(next: Space[]) {
      current = next
      setSpaces(next)
    }
    function status() {
      setConnection('online')
      setMessage(socket.connected ? 'Conectado en tiempo real · WebSocket' : 'Conexión REST de respaldo · Reintentando WebSocket')
    }

    async function sync(restart = false) {
      if (disposed) return
      if (controller && !restart) return
      if (restart) controller?.abort()
      const epoch = ++generation
      const request = new AbortController()
      controller = request
      const timeout = window.setTimeout(() => request.abort(), 8000)
      try {
        let latest = await getSpaces(request.signal)
        if (disposed || epoch !== generation) return
        // Los eventos recibidos durante el GET pueden ser posteriores a la foto inicial.
        for (const incoming of pending.values()) latest = mergeSpace(latest, incoming)
        pending.clear()
        ready = true
        publish(refreshSpaceFreshness(latest))
        status()
      } catch {
        if (disposed || epoch !== generation) return
        ready = false
        publish(unknownSpaces())
        setConnection('offline')
        setMessage('No podemos confirmar las plazas. Verifica que NestJS y MySQL estén activos.')
      } finally {
        window.clearTimeout(timeout)
        if (epoch === generation) controller = null
      }
    }

    function onReading(payload: unknown) {
      if (disposed) return
      const incoming = parseSpace(payload)
      if (!incoming) return
      if (!ready || controller) {
        const previous = pending.get(incoming.id)
        pending.set(incoming.id, previous ? mergeSpace([previous], incoming)[0] : incoming)
      }
      if (ready) {
        publish(refreshSpaceFreshness(mergeSpace(current, incoming)))
        status()
      }
    }
    function onConnect() {
      if (disposed) return
      setSocketConnected(true);setReservationRevision(n=>n+1)
      ready = false
      pending.clear()
      setConnection('connecting')
      setMessage('Sincronizando disponibilidad con NestJS…')
      void sync(true)
    }
    function onDisconnect() {
      if (disposed) return
      setSocketConnected(false);setReservationRevision(n=>n+1)
      ready = false
      pending.clear()
      setConnection('connecting')
      setMessage('Recuperando disponibilidad por REST…')
      void sync(true)
    }
    function onConnectError() {
      if (disposed) return
      if (ready) status()
      else void sync()
    }

    const onReservation=()=>{if(!disposed)setReservationRevision(n=>n+1)}
    socket.on('reservas.actualizadas',onReservation)
    socket.on(EVENT, onReading)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    void sync()
    socket.connect()

    const fallback = window.setInterval(() => {
      if (!socket.connected || !ready) void sync()
    }, pollingIntervalMs)
    // Temporizador local (sin red) para señalar lecturas antiguas aun sin eventos.
    const freshness = window.setInterval(() => {
      if (!ready) return
      const next = refreshSpaceFreshness(current)
      if (next !== current) publish(next)
    }, 5000)

    return () => {
      disposed = true
      generation++
      window.clearInterval(fallback)
      window.clearInterval(freshness)
      controller?.abort()
      socket.off('reservas.actualizadas',onReservation)
      socket.off(EVENT, onReading)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.disconnect()
    }
  }, [retry])

  return { spaces, connection, message, socketConnected, reservationRevision, reconnect: () => setRetry(n => n + 1) }
}
