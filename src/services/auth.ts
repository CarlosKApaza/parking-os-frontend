export type Usuario = { id:number; nombre:string; correo:string; telefono:string|null; rol:'CLIENTE'|'ADMINISTRADOR'; activo:boolean; fechaRegistro:string; billetera:{id:number;saldo:string}|null }
export type Vehiculo = { id:number; usuarioId:number; placa:string; marca:string|null; modelo:string|null; color:string|null; estadoVerificacion:'PENDIENTE'|'VERIFICADO'|'RECHAZADO'; activo:boolean }
export type Login = { accessToken:string; tokenType:'Bearer'; expiresIn:number; usuario:Usuario }
export class ApiError extends Error { constructor(public status:number,message:string){super(message)} }
const base=(import.meta.env.VITE_ACCOUNT_API_URL || '/api').replace(/\/$/,'')
export async function accountRequest<T>(path:string,options:{method?:string;body?:unknown;token?:string;signal?:AbortSignal}={}):Promise<T>{
  let response:Response
  try {
    response=await fetch(base+path,{method:options.method||'GET',signal:options.signal,cache:'no-store',headers:{Accept:'application/json',...(options.body!==undefined?{'Content-Type':'application/json'}:{}),...(options.token?{Authorization:'Bearer '+options.token}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})})
  } catch(error){if(options.signal?.aborted)throw error;throw new ApiError(0,'No se pudo conectar con Parking OS. Verifica el backend.')}
  const data=await response.json().catch(()=>null)
  if(!response.ok)throw new ApiError(response.status,typeof data?.message==='string'?data.message:'No se pudo completar la solicitud.')
  if(data===null)throw new ApiError(502,'Respuesta no válida del servidor.')
  return data as T
}
