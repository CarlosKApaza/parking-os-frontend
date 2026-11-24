import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {accountRequest,ApiError,type Login,type Usuario} from '@/services/auth'
import {readSession,saveSession,type StoredSession} from '@/services/session'
type Session=StoredSession&{user:Usuario}
type ContextValue={user:Usuario|null;login:(correo:string,password:string)=>Promise<void>;logout:()=>void;request:<T>(path:string,options?:{method?:string;body?:unknown;signal?:AbortSignal})=>Promise<T>;updateUser:(user:Usuario)=>void}
const Context=createContext<ContextValue|null>(null)
function readStored(){try{return readSession(window.sessionStorage)}catch{return null}}
function persist(value:StoredSession|null){try{saveSession(window.sessionStorage,value)}catch{/* sesión en memoria */}}
export function AuthProvider({children}:{children:ReactNode}){
  // Solo el JWT y su vencimiento se conservan por pestaña para el entorno demo.
  const [stored]=useState(readStored)
  const [restoring,setRestoring]=useState(!!stored)
  const [restoreError,setRestoreError]=useState('')
  const [retry,setRetry]=useState(0)
  const [session,setSession]=useState<Session|null>(null)
  const current=useRef<Session|null>(null)
  const generation=useRef(0)
  function logout(){generation.current++;current.current=null;persist(null);setSession(null);setRestoreError('');setRestoring(false)}
  function establish(next:Session){current.current=next;persist(next);setSession(next)}
  useEffect(()=>{
    if(!stored)return
    if(Date.now()>=stored.expiresAt){logout();return}
    const c=new AbortController(),epoch=generation.current
    setRestoreError('')
    accountRequest<Usuario>('/auth/me',{token:stored.token,signal:c.signal}).then(user=>{
      if(c.signal.aborted||epoch!==generation.current)return
      if(Date.now()>=stored.expiresAt){logout();return}
      establish({...stored,user});setRestoring(false)
    }).catch(error=>{
      if(c.signal.aborted||epoch!==generation.current)return
      if(error instanceof ApiError&&error.status===401){logout();return}
      // Un corte de red temporal no destruye una sesión potencialmente válida.
      setRestoreError('No pudimos verificar tu sesión. Comprueba la conexión con Parking OS.')
    })
    return ()=>c.abort()
  },[stored,retry])
  async function login(correo:string,password:string){
    const epoch=++generation.current
    const data=await accountRequest<Login>('/auth/login',{method:'POST',body:{correo,password}})
    if(epoch!==generation.current)throw new Error('La solicitud fue cancelada.')
    if(!data.accessToken||!data.usuario||!Number.isFinite(data.expiresIn)||data.expiresIn<=0)throw new Error('Respuesta de sesión no válida.')
    establish({token:data.accessToken,user:data.usuario,expiresAt:Date.now()+data.expiresIn*1000})
  }
  useEffect(()=>{
    const expiresAt=session?.expiresAt??(restoring?stored?.expiresAt:undefined)
    if(!expiresAt)return
    const check=()=>{if(Date.now()>=expiresAt)logout()}
    const timer=window.setTimeout(check,Math.max(0,expiresAt-Date.now()))
    document.addEventListener('visibilitychange',check)
    window.addEventListener('pageshow',check)
    return ()=>{window.clearTimeout(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('pageshow',check)}
  },[session?.expiresAt,restoring,stored?.expiresAt])
  async function request<T>(path:string,options:{method?:string;body?:unknown;signal?:AbortSignal}={}){
    const active=current.current
    if(!active||Date.now()>=active.expiresAt){logout();throw new ApiError(401,'Inicia sesión para continuar.')}
    try{
      const result=await accountRequest<T>(path,{...options,token:active.token})
      if(current.current?.token!==active.token)throw new ApiError(401,'La sesión ha cambiado.')
      return result
    }catch(error){if(error instanceof ApiError&&error.status===401&&current.current?.token===active.token)logout();throw error}
  }
  function updateUser(user:Usuario){const active=current.current;if(active?.user.id!==user.id)return;const next={...active,user};current.current=next;setSession(next)}
  if(restoring)return <div className="auth-shell"><div className="auth-inner auth-restore"><div className="auth-brand"><span className="brand-icon">P<span>•</span></span><strong>parking<span>os</span></strong></div>{restoreError?<><p role="alert" className="auth-error">{restoreError}</p><button className="auth-primary" onClick={()=>setRetry(n=>n+1)}>Reintentar</button><button className="auth-text-link" onClick={logout}>Continuar como invitado</button></>:<p role="status">Recuperando tu sesión…</p>}</div></div>
  return <Context.Provider value={{user:session?.user??null,login,logout,request,updateUser}}>{children}</Context.Provider>
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider no encontrado');return value}
