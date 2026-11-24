/** Fuentes de video MJPEG de Parking OS.
 *  Cada webcam tiene un proceso de captura independiente, en otro puerto.
 *  Las dos vistas aparecen siempre; una webcam desconectada NO es un video simulado.
 */
export type CameraSource = {
  id: 'entrada' | 'salida'
  name: string
  zone: string
  model: string
  baseUrl: string | null
}

export function resolveCameraBaseUrl(
  configured: string | undefined,
  hostname: string,
  protocol: string,
  port = 8765,
): string | null {
  const requested = configured?.trim()
  if (requested) {
    try {
      const url = new URL(requested)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
      if (protocol === 'https:' && url.protocol !== 'https:') return null
      return url.href.replace(/\/+$/, '')
    } catch {
      return null
    }
  }
  if (protocol === 'https:') return null
  const host = hostname.includes(':') ? `[${hostname}]` : hostname || '127.0.0.1'
  return `http://${host}:${port}`
}

/** Puro: probamos ambas fuentes sin depender de window. */
export function buildCameraSources(
  hostname: string,
  protocol: string,
  entradaUrl?: string,
  salidaUrl?: string,
): CameraSource[] {
  return [
    {
      id: 'entrada',
      name: 'Cámara 01',
      zone: 'Zona de acceso',
      model: 'UVC',
      baseUrl: resolveCameraBaseUrl(entradaUrl, hostname, protocol, 8765),
    },
    {
      id: 'salida',
      name: 'Cámara 02',
      zone: 'Zona de salida',
      model: 'W77 · 1080p',
      baseUrl: resolveCameraBaseUrl(salidaUrl, hostname, protocol, 8766),
    },
  ]
}

export function cameraSources(): CameraSource[] {
  return buildCameraSources(
    window.location.hostname,
    window.location.protocol,
    import.meta.env.VITE_CAMERA_ENTRADA_URL,
    import.meta.env.VITE_CAMERA_SALIDA_URL,
  )
}
