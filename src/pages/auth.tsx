import {useEffect,useState,type FormEvent,type ReactNode} from 'react'
import {Link,Navigate,useLocation,useNavigate} from 'react-router-dom'
import {ArrowLeft,ArrowRight,Eye,EyeOff,LockKeyhole,Mail,ParkingSquare,UserRound} from 'lucide-react'
import {useAuth} from '@/context/auth-context'
import {accountRequest} from '@/services/auth'

function Brand(){return <div className="auth-brand"><span className="brand-icon">P<span>•</span></span><strong>parking<span>os</span></strong></div>}
function nextPath(search:string){const value=new URLSearchParams(search).get('next');return value&&/^\/(?![\/\\])/.test(value)&&!/[\\\r\n]/.test(value)?value:'/'}
export function RequireAuth({children}:{children:ReactNode}){const {user}=useAuth();const location=useLocation();return user?children:<Navigate replace to={'/login?next='+encodeURIComponent(location.pathname+location.search)}/>}
export function InitialHome({children}:{children:ReactNode}){
  const [first]=useState(()=>{try{return sessionStorage.getItem('parkingos:welcome:v1')!=='1'}catch{return false}})
  const navigate=useNavigate()
  useEffect(()=>{if(!first)return;const timer=window.setTimeout(()=>{try{sessionStorage.setItem('parkingos:welcome:v1','1')}catch{}navigate('/bienvenida',{replace:true})},750);return()=>window.clearTimeout(timer)},[first,navigate])
  return first?<div className="auth-splash"><Brand/><p>Estacionamiento inteligente</p><span className="auth-loading-line"/></div>:children
}
export function WelcomePage(){return <div className="auth-shell auth-welcome"><div className="auth-inner"><Brand/><div className="auth-art"><span className="auth-parking-outline"/><ParkingSquare className="auth-art-icon" size={44}/><img src="/parking-space-sedan-v2.webp" alt="Automóvil en una plaza"/></div><div className="auth-welcome-copy"><h1>Tu espacio,<br/><span>sin dar vueltas.</span></h1><p>Consulta, reserva y paga desde un solo lugar.</p></div><Link className="auth-primary" to="/login">Comenzar <ArrowRight size={20}/></Link><Link className="auth-text-link" to="/">Continuar como invitado</Link></div></div>}
export function AuthPage({register=false}:{register?:boolean}){
  const auth=useAuth(),location=useLocation(),navigate=useNavigate()
  const next=nextPath(location.search)
  const [name,setName]=useState(''),[correo,setCorreo]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  if(auth.user)return <Navigate replace to={next}/>
  async function submit(e:FormEvent){e.preventDefault();if(busy)return;setError('')
    if(register&&password!==confirm){setError('Las contraseñas no coinciden.');return}
    setBusy(true)
    try{if(register){await accountRequest('/auth/registro',{method:'POST',body:{nombre:name,correo,password}})}await auth.login(correo,password);navigate(next,{replace:true})}
    catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar sesión.')}finally{setBusy(false)}
  }
  return <div className="auth-shell"><div className="auth-inner auth-form-inner"><Link to="/" className="auth-back"><ArrowLeft size={19}/>Inicio</Link><Brand/><div className="auth-heading"><h1>{register?'Crear cuenta':'Iniciar sesión'}</h1><p>{register?'Empieza a utilizar Parking OS.':'Accede a tu cuenta para gestionar tu estacionamiento.'}</p></div>
    <form className="auth-form" onSubmit={submit}>
      {register&&<label>Nombre completo<span className="auth-field"><UserRound size={19}/><input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" placeholder="Tu nombre"/></span></label>}
      <label>Correo electrónico<span className="auth-field"><Mail size={19}/><input type="email" value={correo} onChange={e=>setCorreo(e.target.value)} required maxLength={150} autoComplete="email" placeholder="correo@ejemplo.com"/></span></label>
      <label>Contraseña<span className="auth-field"><LockKeyhole size={19}/><input type={visible?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={register?8:1} maxLength={128} autoComplete={register?'new-password':'current-password'} placeholder="Tu contraseña"/><button type="button" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label>
      {register&&<label>Confirmar contraseña<span className="auth-field"><LockKeyhole size={19}/><input type={visible?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Repite tu contraseña"/></span></label>}
      {error&&<p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy?'Conectando…':register?'Crear cuenta':'Iniciar sesión'}<ArrowRight size={19}/></button>
    </form>
    <p className="auth-switch">{register?'¿Ya tienes cuenta?':'¿No tienes cuenta?'} <Link to={(register?'/login':'/registro')+location.search}>{register?'Inicia sesión':'Regístrate'}</Link></p><div className="auth-divider"/><Link className="auth-text-link" to="/">Continuar como invitado</Link><p className="auth-demo-note">Entorno de feria · Utiliza datos de prueba.</p>
  </div></div>
}
