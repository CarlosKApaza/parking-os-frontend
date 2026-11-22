import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Maximize2, RefreshCw, VideoOff, WifiOff } from 'lucide-react'
import { cameraSources } from '@/services/camera'

type CameraStatus = 'checking' | 'online' | 'offline' | 'unsupported'

/**
 * Consume JPEGs individuales del mismo CameraHub que sirve MJPEG.
 * Se comprueba que el fotograma se pueda decodificar ANTES de mostrar "En vivo".
 * Esto evita el visor negro de algunos navegadores que no decodifican el stream MJPEG.
 * Una UVC es compartida por PC + telefonos: jamas abrimos VideoCapture desde el navegador.
 */
export function SecurityPage() {
  const sources = useMemo(() => cameraSources(), [])
  const [cameraId, setCameraId] = useState(sources[0].id)
  const current = sources.find(source => source.id === cameraId) ?? sources[0]
  const [status, setStatus] = useState<CameraStatus>('checking')
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [lastError, setLastError] = useState('')
  const [fullscreenError, setFullscreenError] = useState('')
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    let activeController: AbortController | undefined
    const recentObjectUrls: string[] = []
    let frameIndex = 0

    if (!current.baseUrl) {
      setFrameUrl(null)
      setStatus('unsupported')
      setLastError('La página HTTPS requiere una dirección de cámara HTTPS.')
      return
    }

    const baseUrl = current.baseUrl
    setFrameUrl(null)
    setStatus('checking')
    setLastError('')

    async function loadFrame() {
      const controller = new AbortController()
      activeController = controller
      const watchdog = window.setTimeout(() => controller.abort(), 4500)
      try {
        const response = await fetch(baseUrl + '/snapshot.jpg?frame=' + (++frameIndex), {
          cache: 'no-store',
          signal: controller.signal,
          headers: { Accept: 'image/jpeg' },
        })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const jpeg = await response.blob()
        if (!jpeg.type.startsWith('image/jpeg') || jpeg.size < 100) {
          throw new Error('El servidor no entregó una imagen JPEG válida')
        }
        const candidateUrl = URL.createObjectURL(jpeg)

        // No aceptar una respuesta que sea JPEG pero no se pueda mostrar.
        const image = new Image()
        const decoded = await new Promise<boolean>(resolve => {
          image.onload = () => resolve(true)
          image.onerror = () => resolve(false)
          image.src = candidateUrl
        })
        if (!decoded || cancelled) {
          URL.revokeObjectURL(candidateUrl)
          if (!cancelled) throw new Error('No se pudo decodificar el fotograma')
          return
        }
        recentObjectUrls.push(candidateUrl)
        setFrameUrl(candidateUrl)
        setStatus('online')
        setLastError('')
        // Mantener una imagen previa hasta que React pinte la nueva.
        if (recentObjectUrls.length > 3) {
          const old = recentObjectUrls.shift()
          if (old) URL.revokeObjectURL(old)
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('offline')
          setLastError(error instanceof Error ? error.message : 'Error de transmisión')
        }
      } finally {
        window.clearTimeout(watchdog)
        if (activeController === controller) activeController = undefined
        if (!cancelled) refreshTimer = window.setTimeout(loadFrame, 450)
      }
    }
    void loadFrame()

    return () => {
      cancelled = true
      if (refreshTimer) window.clearTimeout(refreshTimer)
      activeController?.abort()
      recentObjectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [current.baseUrl, revision])

  function reconnect() {
    setFullscreenError('')
    setRevision(previous => previous + 1)
  }

  function expand() {
    const frame = frameRef.current
    if (!frame || typeof frame.requestFullscreen !== 'function') {
      setFullscreenError('Pantalla completa no disponible en este navegador.')
      return
    }
    void frame.requestFullscreen().catch(() => setFullscreenError('El navegador no permitió ampliar el video.'))
  }

  const active = status === 'online' && frameUrl !== null
  const label = active ? 'En vivo' : status === 'checking' ? 'Conectando' : 'Sin señal'
  const guidance = status === 'unsupported'
    ? 'La cámara requiere una dirección HTTPS si la aplicación usa HTTPS.'
    : status === 'checking'
      ? 'Buscando fotogramas de la cámara...'
      : lastError === 'HTTP 503'
        ? 'La UVC está apagada u ocupada por otro programa. Revisa la terminal de Python.'
        : 'Comprueba que la cámara siga encendida y que ambos equipos estén en la misma red Wi-Fi.'

  return <section className="security-live" aria-label="Videovigilancia de Parking OS">
    <div className="security-live-heading">
      <h1>Seguridad</h1>
      <span className={'security-live-indicator ' + (active ? 'is-online' : '')} role="status">
        <i aria-hidden="true"/>{label}
      </span>
    </div>

    {sources.length > 1 && <div className="security-live-tabs" role="group" aria-label="Seleccionar cámara">
      {sources.map(source => <button key={source.id} type="button"
        className={source.id === current.id ? 'is-active' : ''}
        aria-pressed={source.id === current.id} onClick={() => setCameraId(source.id)}>
        {source.name}
      </button>)}
    </div>}

    <div className="security-live-card">
      <div className="security-live-meta">
        <span className="security-live-camera-icon"><Camera size={19}/></span>
        <div><strong>{current.name}</strong><small>{current.zone} · Maqueta física</small></div>
        <span className="security-live-quality">UVC</span>
      </div>
      <div className="security-live-stage" ref={frameRef}>
        {active && frameUrl && <img
          src={frameUrl}
          alt={'Video en directo: ' + current.zone}
          className="security-live-stream"
          draggable={false}
        />}
        {!active && <div className="security-live-placeholder">
          {status === 'checking' ? <RefreshCw className="security-live-rotating" size={30}/> :
            status === 'unsupported' ? <WifiOff size={35}/> : <VideoOff size={37}/>}
          <strong>{status === 'checking' ? 'Conectando con la cámara' : 'Cámara no disponible'}</strong>
          <p>{guidance}</p>
          {status !== 'checking' && <button type="button" onClick={reconnect}><RefreshCw size={16}/>Reintentar</button>}
        </div>}
        {active && <span className="security-live-overlay">● EN VIVO</span>}
      </div>
    </div>

    <div className="security-live-toolbar">
      <span>Vista compartida en red local</span>
      <div>
        <button type="button" onClick={reconnect} aria-label="Reconectar transmisión" title="Reconectar">
          <RefreshCw size={18}/><span>Reconectar</span>
        </button>
        <button type="button" onClick={expand} disabled={!active} aria-label="Ampliar cámara" title="Pantalla completa">
          <Maximize2 size={18}/><span>Ampliar</span>
        </button>
      </div>
    </div>
    {fullscreenError && <p className="security-live-message" role="status">{fullscreenError}</p>}
    <p className="security-live-note">Prototipo en Wi-Fi local · Sin grabación ni reconocimiento facial</p>
  </section>
}
