import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Camera, CarFront, Check, Code2, Edit3, Plus, Radio, ReceiptText, Trash2, UserRound, Wallet, WifiOff } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { useParkingStore } from '@/context/parking-context'
import { type Vehicle } from '@/lib/model'

export function ProfilePage() {
  const { demo, update, isDemo, isLiveOccupancy, setNotice, simulatedOffline, setSimulatedOffline, resetDemo } = useParkingStore()
  const [editing, setEditing] = useState(false), [name, setName] = useState(demo.name)
  const [simulator, setSimulator] = useState(false)
  const [resetting, setResetting] = useState(false)
  function save(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; update(s => ({ ...s, name: name.trim() })); setEditing(false); setNotice('Nombre de demostración actualizado') }
  return <div className="account-v2 account-profile profile-landing">
    <h1>Mi perfil</h1>
    <section className="profile-hero" aria-label="Mi cuenta">
      <div className="profile-hero-parking" aria-hidden="true">
        <span className="profile-lane lane-first"/><span className="profile-lane lane-last"/>
        <span className="profile-bracket bracket-top"/><span className="profile-bracket bracket-bottom"/>
        <img src="/parking-space-sedan-v2.webp" alt="" draggable={false} decoding="async"/>
      </div>
      <span className="profile-hero-avatar">{isDemo ? demo.name.slice(0,1).toUpperCase() : <UserRound size={28}/>}</span>
      <div className="profile-hero-copy">
        <h2>{isDemo ? demo.name : 'Visitante'}</h2>
        <p>{isDemo ? demo.plus ? 'Parking Plus · Demo' : 'Cuenta de demostración' : 'Consulta pública'}</p>
        <Button variant="outline" className="profile-hero-edit" disabled={!isDemo} onClick={() => {setName(demo.name);setEditing(true)}}><Edit3 size={16}/>Editar perfil</Button>
      </div>
    </section>
    <nav className="profile-quick-grid" aria-label="Actividad de mi cuenta">
      <Link to="/perfil/pagos" className="profile-quick-card profile-quick-payments"><ReceiptText size={30} strokeWidth={1.9}/><strong>Historial<br/>de pagos</strong><ArrowRight className="profile-quick-arrow" size={24}/></Link>
      <Link to="/reservas" className="profile-quick-card profile-quick-reservations"><CalendarDays size={30} strokeWidth={1.9}/><strong>Reservas</strong><ArrowRight className="profile-quick-arrow" size={24}/></Link>
    </nav>
    <nav className="profile-shortcuts" aria-label="Opciones de mi perfil">
      {[
        {to:'/vehiculos',Icon:CarFront,title:'Mis vehículos',tone:'mint'},
        {to:'/billetera',Icon:Wallet,title:'Billetera',tone:'blue'},
        {to:'/seguridad',Icon:Camera,title:'Cámaras',tone:'mint'},
      ].map(({to,Icon,title,tone}) => <Link className={'profile-shortcut '+tone} to={to} key={to}><span className="profile-shortcut-icon"><Icon size={27} strokeWidth={1.9}/></span><strong>{title}</strong><ArrowRight size={23}/></Link>)}
    </nav>
    {isDemo && !isLiveOccupancy && <section className="simulator-panel"><button className="simulator-toggle" onClick={() => setSimulator(!simulator)} aria-expanded={simulator}><Code2 size={18}/><span>Herramientas de demostración</span><Plus size={17}/></button>{simulator && <div className="simulator-content"><p>Cambia la ocupación de P2 para ver cómo responden el plano y los contadores. Las pruebas no envían órdenes a ningún dispositivo.</p><div className="simulator-buttons"><Button variant="outline" onClick={() => { update(s => ({ ...s, occupancy: s.occupancy.map((status,i) => i === 1 ? status === 'OCCUPIED' ? 'FREE' : 'OCCUPIED' : status) })); setNotice('Estado simulado de P2 actualizado') }}><Radio size={17}/>Cambiar estado de P2</Button><Button variant="outline" onClick={() => setSimulatedOffline(!simulatedOffline)}><WifiOff size={17}/>{simulatedOffline ? 'Restaurar señal' : 'Simular pérdida de señal'}</Button><Button variant="outline" onClick={() => setResetting(true)}>Reiniciar datos de prueba</Button></div></div>}</section>}
    <Modal open={resetting} onOpenChange={setResetting} title="¿Empezar una nueva demostración?" description="Se restablecerán el saldo, los tokens, los tickets y las reservas. También se quitarán los vehículos ficticios guardados en este navegador."><div className="dialog-actions"><Button variant="outline" onClick={() => setResetting(false)}>Conservar datos</Button><Button onClick={() => { resetDemo(); setResetting(false) }}>Reiniciar demo</Button></div></Modal>
    <Modal open={editing} onOpenChange={setEditing} title="Editar perfil" description="Actualiza tu nombre de demostración."><form onSubmit={save}><label className="field-label" htmlFor="profile-name">Nombre</label><input id="profile-name" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} maxLength={30} required/><Button className="w-full mt-6" type="submit" disabled={!name.trim()}>Guardar cambios<Check size={17}/></Button></form></Modal></div>
}

export function VehiclesPage() {
  const { demo, update, setNotice, isDemo } = useParkingStore()
  const [adding, setAdding] = useState(false), [removing, setRemoving] = useState<Vehicle | null>(null)
  const [plate, setPlate] = useState(''), [model, setModel] = useState(''), [error, setError] = useState('')
  function add(event: FormEvent) {
    event.preventDefault()
    const normalized = plate.trim().toUpperCase().replace(/[\s-]/g,'')
    if (!/^[A-Z0-9]{5,10}$/.test(normalized)) { setError('Usa una placa de 5 a 10 letras y números.'); return }
    if (demo.vehicles.some(v => v.plate === normalized)) { setError('Esa placa ya está en tu lista.'); return }
    if (!model.trim()) { setError('Introduce un nombre para tu vehículo.'); return }
    update(s => ({ ...s, vehicles: [...s.vehicles, { id: crypto.randomUUID(), plate: normalized, model: model.trim() }] }))
    setAdding(false); setPlate(''); setModel(''); setError(''); setNotice('Vehículo de prueba añadido')
  }
  return <div className="account-v2 vehicles-v2"><Link className="account-back" to="/perfil"><ArrowLeft size={20}/>Perfil</Link><div className="account-title-row"><h1>Mis vehículos</h1>{isDemo && demo.vehicles.length > 0 && <Button className="account-primary account-small-action" onClick={() => { setError(''); setAdding(true) }}><Plus size={18}/>Añadir</Button>}</div><p className="account-subtitle">Gestiona tus placas.</p>{isDemo && demo.vehicles.length ? <div className="vehicles-grid">{demo.vehicles.map(vehicle => <article className="vehicle-card" key={vehicle.id}><span className="large-tile-icon"><CarFront size={26}/></span><div className="vehicle-info"><h2>{vehicle.model}</h2><span className="license-plate">{vehicle.plate}</span><small>Sin verificar · Demo</small></div><button aria-label={`Eliminar vehículo ${vehicle.plate}`} className="icon-button" onClick={() => setRemoving(vehicle)}><Trash2 size={18}/></button></article>)}</div> : <div className="panel"><EmptyState icon={<CarFront size={40}/>} title="Sin vehículos registrados" action={isDemo && <Button className="account-primary" onClick={() => {setError('');setAdding(true)}}><Plus size={18}/>Añadir vehículo</Button>}>{isDemo ? 'Registra tu primera placa de prueba.' : 'Disponible con el servicio de cuentas.'}</EmptyState></div>}<p className="account-note">Placas de prueba · Sin verificación ni cobros automáticos.</p><Modal open={adding} onOpenChange={setAdding} title="Añadir vehículo" description="Introduce una placa de prueba."><form onSubmit={add}><label htmlFor="vehicle-model" className="field-label">Nombre del vehículo</label><input id="vehicle-model" value={model} onChange={e => setModel(e.target.value)} placeholder="Ej. Mi sedán azul" maxLength={40} required/><label htmlFor="vehicle-plate" className="field-label">Placa de prueba</label><input id="vehicle-plate" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="Ej. 1234ABC" maxLength={12} required/>{error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" className="w-full mt-6">Guardar vehículo<Check size={17}/></Button></form></Modal><Modal open={!!removing} onOpenChange={open => !open && setRemoving(null)} title="¿Eliminar este vehículo?" description={`Se quitará ${removing?.plate || ''} de tu lista de prueba.`}><div className="dialog-actions"><Button variant="outline" onClick={() => setRemoving(null)}>Conservar</Button><Button variant="destructive" onClick={() => { update(s => ({ ...s, vehicles: s.vehicles.filter(v => v.id !== removing?.id) })); setRemoving(null); setNotice('Vehículo eliminado') }}>Eliminar</Button></div></Modal></div>
}
