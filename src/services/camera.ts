/** Origen del video de seguridad. Una sola cámara de entrada activa por defecto.
 *  La segunda solo aparece si se configura expresamente (sin pantallas ficticias). */
export type CameraSource = { id: string; name: string; zone: string; baseUrl: string | null }

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
      // No permitir que un HTTPS PWA solicite video HTTP (mixed content).
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

export function cameraSources(): CameraSource[] {
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  const entrance: CameraSource = {
    id: 'entrada',
    name: 'Cámara 01',
    zone: 'Acceso principal',
    baseUrl: resolveCameraBaseUrl(import.meta.env.VITE_CAMERA_ENTRADA_URL, hostname, protocol),
  }
  const sources = [entrance]
  // Cuando exista una segunda UVC, iniciar otro proceso en otro puerto.
  const second = (import.meta.env.VITE_CAMERA_SALIDA_URL as string | undefined)?.trim()
  if (second) {
    sources.push({
      id: 'salida',
      name: 'Cámara 02',
      zone: 'Zona de salida',
      baseUrl: resolveCameraBaseUrl(second, hostname, protocol),
    })
  }
  return sources
}
