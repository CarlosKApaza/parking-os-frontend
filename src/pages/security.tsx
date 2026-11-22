import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Maximize2, RefreshCw, VideoOff, WifiOff } from 'lucide-react'
import { cameraSources } from '@/services/camera'

type CameraStatus = 'checking' | 'online' | 'offline' | 'unsupported'

export function SecurityPage() {
  const sources = useMemo(() => cameraSources(), [])
  const [cameraId, setCameraId] = useState(sources[0].id)
  const current = sources.find(source => source.id === cameraId) ?? sources[0]
  const [status, setStatus] = useState<CameraStatus>('checking')
  const [streamFailed, setStreamFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [fullscreenError, setFullscreenError] = useState('')
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!current.baseUrl) {
      setStatus('unsupported')
      return
    }
    const baseUrl = current.baseUrl
    setStatus('checking')
    setStreamFailed(false)
    async function checkCamera() {
      try {
        const response = await fetch(baseUrl + '/health', {
          cache: 'no-store',
          signal: AbortSignal.timeout(3500),
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error('Camera HTTP ' + response.status)
        const result = await response.json() as { online?: boolean }
        if (!cancelled) setStatus(result.online === true ? 'online' : 'offline')
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }
    void checkCamera()
    const timer = window.setInterval(() => { void checkCamera() }, 5000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [current.baseUrl, revision])

  function reconnect() {
    setStreamFailed(false)
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

  const active = status === 'online' && !streamFailed
  const label = active ? 'En vivo' : status === 'checking' ? 'Conectando' : 'Sin señal'
  const guidance = status === 'unsupported'
    ? 'La cámara requiere una dirección HTTPS si la aplicación usa HTTPS.'
    : streamFailed
      ? 'Se interrumpió el video. Pulsa Reintentar.'
      : status === 'checking'
        ? 'Buscando cámara en tu red...'
        : 'Enciende camara_seguridad.py en la PC y conecta el celular al mismo Wi-Fi.'

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
        {active && current.baseUrl && <img
          key={current.id + ':' + revision}
          src={current.baseUrl + '/video?rev=' + revision}
          alt={'Video en directo: ' + current.zone}
          className="security-live-stream"
          onError={() => setStreamFailed(true)}
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
