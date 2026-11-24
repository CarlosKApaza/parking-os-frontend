export const SESSION_KEY='parkingos:auth:v1'
export type StoredSession={token:string;expiresAt:number}
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export function readSession(store:Store,now=Date.now()):StoredSession|null{
  try{
    const raw=JSON.parse(store.getItem(SESSION_KEY)??'null')
    if(raw&&typeof raw.token==='string'&&raw.token.length>0&&Number.isFinite(raw.expiresAt)&&raw.expiresAt>now)return {token:raw.token,expiresAt:raw.expiresAt}
    store.removeItem(SESSION_KEY)
  }catch{try{store.removeItem(SESSION_KEY)}catch{/* almacenamiento bloqueado */}}
  return null
}
export function saveSession(store:Store,session:StoredSession|null){
  try{if(session)store.setItem(SESSION_KEY,JSON.stringify({token:session.token,expiresAt:session.expiresAt}));else store.removeItem(SESSION_KEY)}catch{/* respaldo en memoria */}
}
