import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Maximize2, RefreshCw, VideoOff, WifiOff } from 'lucide-react'
import { cameraSources, type CameraSource } from '@/services/camera'

type CameraStatus = 'checking' | 'online' | 'offline' | 'unsupported'

/**
 * Consume JPEGs individuales del mismo CameraHub que sirve MJPEG.
 * Se comprueba que el fotograma se pueda decodificar ANTES de mostrar "En vivo".
 * Esto evita el visor negro de algunos navegadores que no decodifican el stream MJPEG.
 * Una UVC es compartida por PC + telefonos: jamas abrimos VideoCapture desde el navegador.
 */

function CameraPreview({ source, selected, onChoose }: { source: CameraSource; selected: boolean; onChoose: () => void }) {
  const [status, setStatus] = useState<CameraStatus>('checking')
  const [picture, setPicture] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let controller: AbortController | undefined
    const urls: string[] = []
    if (!source.baseUrl) { setStatus('unsupported'); return }
    const base = source.baseUrl
    setStatus('checking')

    async function probe() {
      const request = new AbortController()
      controller = request
      const timeout = window.setTimeout(() => request.abort(), 3500)
      try {
        const response = await fetch(base + '/snapshot.jpg?t=' + Date.now(), {
          cache: 'no-store', headers: { Accept: 'image/jpeg' }, signal: request.signal,
        })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/jpeg') || blob.size < 100) throw new Error('JPEG inválido')
        const url = URL.createObjectURL(blob)
        const image = new Image()
        const decoded = await new Promise<boolean>(resolve => {
          image.onload = () => resolve(true)
          image.onerror = () => resolve(false)
          image.src = url
        })
        if (!decoded || cancelled) {
          URL.revokeObjectURL(url)
          if (!cancelled) throw new Error('JPEG no decodificable')
          return
        }
        urls.push(url)
        setPicture(url)
        setStatus('online')
        if (urls.length > 3) {
          const old = urls.shift()
          if (old) URL.revokeObjectURL(old)
        }
      } catch {
        if (!cancelled) { setPicture(null); setStatus('offline') }
      } finally {
        window.clearTimeout(timeout)
        if (controller === request) controller = undefined
        if (!cancelled) timer = window.setTimeout(probe, 3000)
      }
    }
    void probe()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      controller?.abort()
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [source.baseUrl])

  const online = status === 'online' && picture !== null
  return <button type="button"
    className={'security-live-choice' + (selected ? ' is-selected' : '')}
    aria-pressed={selected}
    aria-label={source.name + ', ' + (online ? 'en vivo' : 'sin conexión')}
    onClick={onChoose}
  >
    <span className="security-live-thumb">
      {online ? <img src={picture} alt="" draggable={false}/> :
        <span className="security-live-thumb-offline"><VideoOff size={27}/></span>}
    </span>
    <span className="security-live-choice-caption">
      <span><strong>{source.name}</strong><i className={online ? 'is-online' : ''}/></span>
      <small>{source.zone}</small>
      <em>{online ? 'En vivo' : status === 'checking' ? 'Conectando…' : 'Sin conexión'}</em>
    </span>
  </button>
}

export function SecurityPage() {
  const sources = useMemo(() => cameraSources(), [])
  const [cameraId, setCameraId] = useState(sources[0].id)
  const current = sources.find(source => source.id === cameraId) ?? sources[0]
  const [status, setStatus] = useState<CameraStatus>('checking')
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  // MJPEG ofrece mas FPS; las imagenes JPEG siguen siendo el modo compatible.
  const [fluidMode, setFluidMode] = useState(true)
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
        // Con MJPEG no es necesario descargar una foto nueva constantemente.
        if (!cancelled) refreshTimer = window.setTimeout(loadFrame, fluidMode ? 2000 : 100)
      }
    }
    void loadFrame()

    return () => {
      cancelled = true
      if (refreshTimer) window.clearTimeout(refreshTimer)
      activeController?.abort()
      recentObjectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [current.baseUrl, revision, fluidMode])

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



    <div className="security-live-card">
      <div className="security-live-meta">
        <span className="security-live-camera-icon"><Camera size={19}/></span>
        <div><strong>{current.name}</strong><small>{current.zone} · Maqueta física</small></div>
        <span className="security-live-quality">UVC</span>
      </div>
      <div className="security-live-stage" ref={frameRef}>
        {active && frameUrl && <img
          src={fluidMode && current.baseUrl ? current.baseUrl + '/video?rev=' + revision : frameUrl}
          alt={'Video en directo: ' + current.zone}
          className="security-live-stream"
          onError={() => { if (fluidMode) setFluidMode(false) }}
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
      <span>Vista compartida · {fluidMode ? 'Alta fluidez' : 'Modo compatible'}</span>
      <div>
        <button type="button" onClick={() => setFluidMode(value => !value)}
          aria-label={fluidMode ? 'Usar modo compatible' : 'Activar alta fluidez'}
          title={fluidMode ? 'Modo compatible (JPEG)' : 'Alta fluidez (MJPEG)'}>
          <Camera size={18}/><span>{fluidMode ? 'Compatible' : 'Más FPS'}</span>
        </button>
        <button type="button" onClick={reconnect} aria-label="Reconectar transmisión" title="Reconectar">
          <RefreshCw size={18}/><span>Reconectar</span>
        </button>
        <button type="button" onClick={expand} disabled={!active} aria-label="Ampliar cámara" title="Pantalla completa">
          <Maximize2 size={18}/><span>Ampliar</span>
        </button>
      </div>
    </div>
    {fullscreenError && <p className="security-live-message" role="status">{fullscreenError}</p>}
    <div className="security-live-choices-heading">
      <h2>Tus cámaras</h2><span>Selecciona una vista</span>
    </div>
    <div className="security-live-choices" role="group" aria-label="Cámaras disponibles">
      {sources.map(source => <CameraPreview
        key={source.id}
        source={source}
        selected={source.id === current.id}
        onChoose={() => { setCameraId(source.id); setFluidMode(true) }}
      />)}
    </div>

    <p className="security-live-note">Prototipo en Wi-Fi local · Sin grabación ni reconocimiento facial</p>
  </section>
}
