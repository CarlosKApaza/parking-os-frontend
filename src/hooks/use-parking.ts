import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getSpaces, isDemo, mergeSpace, parseSpace, parseSnapshot, realtimeConfig, unknownSpaces } from '@/services/parking'
import type { Space } from '@/lib/model'

export function useParking() {
  const [spaces, setSpaces] = useState<Space[]>(unknownSpaces)
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [message, setMessage] = useState('Conectando con el estacionamiento…')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (isDemo) return
    let disposed = false, snapshotReady = false, syncing = false, lastSignal = 0, request = 0
    let pending: Space[] = []
    let controller = new AbortController()
    const socket = io(realtimeConfig.url, { path: realtimeConfig.path, autoConnect: false, reconnection: true, timeout: 7000 })
    const markOffline = (reason: string) => {
      if (disposed) return
      snapshotReady = false
      setConnection('offline'); setMessage(reason); setSpaces(unknownSpaces())
    }
    async function sync() {
      if (syncing || disposed || !socket.connected) return
      syncing = true; pending = []
      const requestId = ++request
      controller.abort(); controller = new AbortController()
      snapshotReady = false
      setConnection('connecting'); setMessage('Actualizando disponibilidad…'); setSpaces(unknownSpaces())
      const requestController = controller
      const timeout = window.setTimeout(() => requestController.abort(), 8000)
      try {
        const latest = await getSpaces(controller.signal)
        if (disposed || requestId !== request || !socket.connected) return
        // Los eventos recibidos mientras REST responde no deben perderse.
        setSpaces(pending.reduce(mergeSpace, latest)); pending = []; snapshotReady = true; lastSignal = Date.now()
        setConnection('online'); setMessage('Disponibilidad conectada')
      } catch {
        if (!disposed && requestId === request) markOffline('No podemos confirmar las plazas. Vuelve a intentarlo.')
      } finally { window.clearTimeout(timeout); if (requestId === request) syncing = false }
    }
    socket.on('connect', sync)
    socket.on('disconnect', () => { ++request; syncing = false; pending = []; controller.abort(); markOffline('Conexión interrumpida. La disponibilidad no está confirmada.') })
    socket.on('connect_error', () => markOffline('Estacionamiento sin conexión. Intentando reconectar…'))
    socket.on(realtimeConfig.event, (payload: unknown) => {
      const incoming = parseSpace(payload)
      let updates: Space[]
      if (incoming) updates = [incoming]
      else { try { updates = parseSnapshot(payload).filter(s => s.updatedAt) } catch { return } }
      if (!snapshotReady) {
        if (!syncing) void sync()
        pending.push(...updates)
        return
      }
      setSpaces(current => updates.reduce(mergeSpace, current))
      lastSignal = Date.now()
    })
    socket.on(realtimeConfig.deviceEvent, (payload: { status?: string; connectivity?: string; online?: boolean }) => {
      if (!payload || typeof payload !== 'object') return
      const status = String(payload.status ?? payload.connectivity ?? '').toLowerCase()
      if (payload.online === false || ['offline', 'disconnected'].includes(status)) { ++request; syncing = false; controller.abort(); pending = []; markOffline('El dispositivo está desconectado. Esperando datos confirmados.'); return }
      if (payload.online === true || ['online', 'connected'].includes(status)) {
        lastSignal = Date.now()
        if (!snapshotReady && socket.connected) void sync()
      }
    })
    const check = window.setInterval(() => {
      if (snapshotReady && Date.now() - lastSignal > realtimeConfig.staleAfter) markOffline('Sin señal reciente del dispositivo. Disponibilidad sin confirmar.')
    }, 2000)
    socket.connect()
    return () => { disposed = true; controller.abort(); window.clearInterval(check); socket.disconnect() }
  }, [retry])
  return { spaces, connection, message, reconnect: () => setRetry(n => n + 1) }
}
