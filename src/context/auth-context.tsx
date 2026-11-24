import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {accountRequest,ApiError,type Login,type Usuario} from '@/services/auth'
type Session={token:string;user:Usuario;expiresAt:number}
type ContextValue={user:Usuario|null;login:(correo:string,password:string)=>Promise<void>;logout:()=>void;request:<T>(path:string,options?:{method?:string;body?:unknown;signal?:AbortSignal})=>Promise<T>;updateUser:(user:Usuario)=>void}
const Context=createContext<ContextValue|null>(null)
export function AuthProvider({children}:{children:ReactNode}){
  // Solo memoria: nunca guardar JWT ni contraseñas en localStorage.
  const [session,setSession]=useState<Session|null>(null)
  const current=useRef<Session|null>(null)
  const generation=useRef(0)
  function logout(){generation.current++;current.current=null;setSession(null)}
  async function login(correo:string,password:string){
    const epoch=++generation.current
    const data=await accountRequest<Login>('/auth/login',{method:'POST',body:{correo,password}})
    if(epoch!==generation.current)throw new Error('La solicitud fue cancelada.')
    if(!data.accessToken||!data.usuario||!Number.isFinite(data.expiresIn)||data.expiresIn<=0)throw new Error('Respuesta de sesión no válida.')
    const next={token:data.accessToken,user:data.usuario,expiresAt:Date.now()+data.expiresIn*1000}
    current.current=next;setSession(next)
  }
  useEffect(()=>{
    if(!session)return
    const timer=window.setTimeout(logout,Math.max(0,session.expiresAt-Date.now()))
    return ()=>window.clearTimeout(timer)
  },[session?.expiresAt])
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
  return <Context.Provider value={{user:session?.user??null,login,logout,request,updateUser}}>{children}</Context.Provider>
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider no encontrado');return value}
