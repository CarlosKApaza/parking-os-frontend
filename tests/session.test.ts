import {describe,it,expect} from 'vitest'
import {readSession,saveSession,SESSION_KEY} from '../src/services/session'
function memory(){const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}}}
describe('sesión por pestaña',()=>{
  it('recupera el token vigente sin persistir el perfil',()=>{
    const storage=memory()
    const value={token:'demo.jwt',expiresAt:2000,user:{nombre:'Alex'},password:'no guardar'}
    saveSession(storage,value)
    expect(readSession(storage,1000)).toEqual({token:'demo.jwt',expiresAt:2000})
    expect(storage.getItem(SESSION_KEY)).not.toContain('Alex')
    expect(storage.getItem(SESSION_KEY)).not.toContain('password')
  })
  it('elimina sesiones vencidas y datos malformados',()=>{
    const storage=memory();saveSession(storage,{token:'demo.jwt',expiresAt:2000})
    expect(readSession(storage,2000)).toBeNull()
    expect(storage.getItem(SESSION_KEY)).toBeNull()
    storage.setItem(SESSION_KEY,'{')
    expect(readSession(storage)).toBeNull()
  })
  it('cerrar sesión elimina la credencial',()=>{
    const storage=memory();saveSession(storage,{token:'demo.jwt',expiresAt:2000})
    saveSession(storage,null);expect(readSession(storage,1000)).toBeNull()
  })
  it('no comparte sesiones entre almacenamientos',()=>{
    const a=memory(),b=memory()
    saveSession(a,{token:'alex',expiresAt:2000});saveSession(b,{token:'daniel',expiresAt:2000})
    expect(readSession(a,1000)?.token).toBe('alex');expect(readSession(b,1000)?.token).toBe('daniel')
  })
})
