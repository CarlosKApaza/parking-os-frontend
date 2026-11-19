import { useEffect, useState } from 'react'
import { getSpaces, isLiveOccupancy, pollingIntervalMs, unknownSpaces } from '@/services/parking'
import type { Space } from '@/lib/model'

// Primera integración con NestJS: solo GET, sin exigir WebSockets ni cambiar el firmware.
// Socket.IO podrá reemplazar la consulta periódica cuando exista el gateway del backend.
export function useParking() {
  const [spaces, setSpaces] = useState<Space[]>(unknownSpaces)
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [message, setMessage] = useState('Conectando con el estacionamiento…')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!isLiveOccupancy) return

    let disposed = false
    let syncing = false
    let controller: AbortController | null = null

    setConnection('connecting')
    setMessage('Consultando disponibilidad real…')

    async function sync() {
      if (disposed || syncing) return
      syncing = true
      const request = new AbortController()
      controller = request
      const timeout = window.setTimeout(() => request.abort(), 8000)

      try {
        const latest = await getSpaces(request.signal)
        if (disposed) return
        setSpaces(latest)
        setConnection('online')
        setMessage('Disponibilidad actualizada desde MySQL')
      } catch {
        if (disposed) return
        setSpaces(unknownSpaces())
        setConnection('offline')
        setMessage('No podemos confirmar las plazas. Verifica que NestJS y MySQL estén activos.')
      } finally {
        window.clearTimeout(timeout)
        syncing = false
      }
    }

    void sync()
    const interval = window.setInterval(() => { void sync() }, pollingIntervalMs)
    return () => { disposed = true; window.clearInterval(interval); controller?.abort() }
  }, [retry])

  return { spaces, connection, message, reconnect: () => setRetry(n => n + 1) }
}
