import {useEffect,useState} from 'react'
import {CarFront,CheckCircle2,Clock3,LockKeyhole,ScanLine,Settings,Wifi,AlertCircle} from 'lucide-react'
import {QRCodeSVG} from 'qrcode.react'
import {money} from '@/lib/utils'
import {cameraSources} from '@/services/camera'
import './exit-terminal.css'
type Terminal={estado:string;sinIR?:boolean;placa?:string;invitado?:boolean;minutos?:number;precioHora?:number;total?:number;pendiente?:number;ruta?:string|null}
export function ExitTerminal(){
  const [data,setData]=useState<Terminal|null>(null),[error,setError]=useState(''),[host,setHost]=useState(window.location.origin),[editing,setEditing]=useState(false)
  useEffect(()=>{
    sessionStorage.removeItem('parkingos:terminal-key')
    let stopped=false;let timer:number|undefined;const controller=new AbortController()
    async function poll(){
      try{
        const res=await fetch('/api/garitas/terminal-salida',{cache:'no-store',signal:controller.signal})
        if(!res.ok)throw new Error(res.status===503?'Activa PAGOS_SIMULADOS=1 en el backend':'No se pudo consultar la garita')
        const next=await res.json() as Terminal
        if(!stopped){setData(next);setError('')}
      }catch(e){if(!stopped){setData(null);setError(e instanceof Error?e.message:'Sin conexión')}}
      finally{if(!stopped)timer=window.setTimeout(poll,900)}
    }
    void poll();return()=>{stopped=true;controller.abort();window.clearTimeout(timer)}
  },[])
  const state=data?.estado??'ESPERA', waiting=state==='ESPERA', pending=state==='PENDIENTE', done=state==='FINALIZADO', open=state==='ABIERTA'
  const url=(()=>{try{const u=new URL(host);if(!['http:','https:'].includes(u.protocol)||['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(u.hostname))return '';return data?.ruta?new URL(data.ruta,u.origin).href:''}catch{return ''}})()
  const camera=cameraSources().find(c=>c.id==='salida')?.baseUrl
  return <main className="terminal-shell">
    <header className="terminal-head"><div className="terminal-brand"><span className="brand-icon">P<span>•</span></span><strong>parking<span>os</span></strong><small>TERMINAL DE COBROS</small></div><div className="terminal-tools"><span className={data?'terminal-online':'terminal-offline'}><Wifi size={17}/>{data?'En línea':'Sin conexión'}</span><button onClick={()=>setEditing(v=>!v)} aria-label="Configuración"><Settings size={22}/></button></div></header>
    {editing&&<section className="terminal-config"><label>Dirección de la PWA para los QR<input value={host} onChange={e=>setHost(e.target.value)} placeholder="http://192.168.1.11:5173"/></label><button onClick={()=>setEditing(false)}>Listo</button></section>}
    {error&&<div className="terminal-error"><AlertCircle size={20}/>{error}</div>}
    <div className="terminal-title"><div><small>ESTACIONAMIENTO PRINCIPAL</small><h1>Terminal de salida</h1></div><span>Pagos de demostración</span></div>
    <div className="terminal-grid"><section className="terminal-card"><div className="terminal-card-heading"><ScanLine size={20}/> Cámara de salida</div>{camera&&<img className="terminal-camera" src={camera+'/video'} alt="Transmisión de la cámara de salida"/>}<div className="terminal-vehicle"><small>{waiting?'SIN VEHÍCULO':'MATRÍCULA DETECTADA'}</small><strong>{data?.placa??'— — —'}</strong><p>{waiting?(data?.sinIR?'Esperando matrícula OCR':'Esperando lectura OCR e IR'):done?'Visita finalizada':data?.invitado?'Cliente invitado':'Cliente registrado'}</p></div>{!waiting&&!done&&<div className="terminal-details"><div><span>Tiempo de estadía</span><b>{data?.minutos??0} min</b></div><div><span>Tarifa / hora</span><b>Bs {money(data?.precioHora??15)}</b></div><div><span>Total pendiente</span><strong>Bs {money(data?.pendiente??0)}</strong></div></div>}</section>
    <section className="terminal-card terminal-action">
      {!data?<><Wifi size={64}/><h2>Conectando con el servidor</h2><p>Verifica que NestJS esté ejecutándose.</p></>:waiting?<><CarFront size={80}/><h2>Esperando vehículo</h2><p>El QR aparecerá al reconocer una matrícula con visita activa en la salida.</p></>:pending?<><span className="terminal-status pending"><Clock3 size={19}/> Pago pendiente</span><h2>Bs {money(data.pendiente??0)}</h2>{(data.invitado||data.sinIR)?url?<><div className="terminal-qr"><QRCodeSVG value={url} size={232} level="M" marginSize={4}/></div><h3>Escanea para pagar</h3><p>Desde tu celular conectado a la misma red.</p><a href={url} target="_blank" rel="noreferrer">Abrir página de pago</a></>:<><p>Abre esta terminal usando la IP de la PC servidor o configúrala aquí para generar el QR.</p><button onClick={()=>setEditing(true)}>Configurar dirección</button></>:<><p>El cliente registrado debe ingresar a Pagar desde su PWA.</p><a href="/pago" target="_blank" rel="noreferrer">Abrir pagos</a></>}<span className="terminal-status"><LockKeyhole size={18}/> Barrera cerrada</span></>:<><CheckCircle2 size={76} className="terminal-check"/><h2>{done?'Salida completada':open?'Barrera abierta':state==='AUTORIZADA'?'Salida autorizada':'Pago confirmado'}</h2><p>{done?'Esperando el siguiente vehículo.':open?(data.sinIR?'Barrera abierta durante 8 segundos. Paso supervisado.':'Puede avanzar.'):(data.sinIR?'Pago confirmado. Espera que se abra la barrera.':'Mantén el vehículo en el sensor hasta que se abra la barrera.')}</p></>}
    </section></div><footer>Parking OS · Feria tecnológica · Sin dinero real</footer>
  </main>
}
