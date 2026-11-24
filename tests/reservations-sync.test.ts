import {describe,it,expect} from 'vitest'
import {resolveSocketOrigin} from '../src/services/parking'
import {serverTimeAt,activePublicHold,type Availability} from '../src/services/reservations'
describe('sincronización entre dispositivos',()=>{
  it('usa el proxy LAN si localhost se configuró para el PC',()=>{
    expect(resolveSocketOrigin('http://127.0.0.1:3000','http://192.168.1.11:5173')).toBe('http://192.168.1.11:5173')
    expect(resolveSocketOrigin('http://127.0.0.1:3000','http://localhost:5173')).toBe('http://127.0.0.1:3000')
    expect(resolveSocketOrigin('http://192.168.1.20:3000','http://192.168.1.11:5173')).toBe('http://192.168.1.20:3000')
  })
  it('usa el reloj del servidor para mostrar la retención y su vencimiento',()=>{
    const snapshot:Availability={servidorAhora:'2026-11-24T11:00:00.000Z',retenciones:[{plaza:'P2',venceEn:'2026-11-24T11:00:30.000Z'}],reservas:[]}
    expect(activePublicHold(snapshot,'P2',serverTimeAt(snapshot.servidorAhora,100,5100))).toBeDefined()
    expect(activePublicHold(snapshot,'P2',serverTimeAt(snapshot.servidorAhora,100,30100))).toBeUndefined()
    expect(activePublicHold(snapshot,'P1',serverTimeAt(snapshot.servidorAhora,100,100))).toBeUndefined()
  })
})
