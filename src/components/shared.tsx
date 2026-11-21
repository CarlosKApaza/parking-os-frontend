import { ArrowLeft, ArrowUpRight, Check, CircleHelp, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useParkingStore } from '@/context/parking-context'
import { statusLabels, type SpaceStatus } from '@/lib/model'
import { Button } from './ui/button'

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}<span className="title-dot">.</span></h1>{description && <p className="subtitle">{description}</p>}</div>{action}</div>
}
export function Back({ to, children }: { to: string; children: ReactNode }) { return <Link className="back-link" to={to}><ArrowLeft size={16} />{children}</Link> }
export function StatusBadge({ status }: { status: SpaceStatus }) { return <span className={cn('status-badge', status)}><i />{statusLabels[status]}</span> }
export function DemoNote({ children }: { children?: ReactNode }) {
  const { isDemo } = useParkingStore()
  return <p className="demo-note"><CircleHelp size={15} /><span>{children || (isDemo ? 'Modo demo. Los datos y las operaciones son de prueba.' : 'Esta función estará disponible próximamente.')}</span></p>
}
export function Availability({ compact = false }: { compact?: boolean }) {
  const { stats, confirmed, isDemo, isLiveOccupancy, spaces } = useParkingStore()
  const staleCount = isLiveOccupancy ? spaces.filter(s => s.isStale && s.occupancy !== 'UNKNOWN').length : 0
  return <section className={cn('availability-section', compact && 'compact')} aria-label="Disponibilidad de las siete plazas">
    <div className="section-heading"><h2>Un lugar para ti</h2><span className="live-label"><i className={confirmed ? '' : 'offline'} />{confirmed ? isLiveOccupancy ? 'Estados registrados en MySQL' : isDemo ? 'Disponibilidad simulada' : 'Conectado' : 'Sin confirmar'}</span></div>
    <div className="stats-grid">{(['free', 'occupied', 'reserved'] as const).map((status, index) => <div className={cn('stat-card', status)} key={status}><div className="stat-label"><span className="stat-dot" />{['Libres', 'Ocupados', 'Reservados'][index]}</div><div className="stat-number">{String(stats[status]).padStart(2, '0')}<span>/ 07</span></div><div className="stat-track"><span style={{ width: `${stats[status] / 7 * 100}%` }} /></div></div>)}</div>
    {stats.unknown > 0 && <p className="unknown-caption">{stats.unknown} de 7 plazas sin confirmar; no se consideran libres.</p>}
    {staleCount > 0 && <p className="unknown-caption">{staleCount} plaza{staleCount !== 1 ? 's' : ''} con lectura antigua: se muestra el último estado guardado, no una confirmación actual.</p>}
  </section>
}
export function ConnectionBanner() {
  const { confirmed, connectionMessage, reconnect, online, isDemo } = useParkingStore()
  if (confirmed && online) return null
  return <div className="connection-banner" role="status"><WifiOff size={18} /><span>{!online && isDemo ? 'Estás sin conexión. Puedes seguir explorando la demo local.' : connectionMessage}</span>{!confirmed && <Button size="sm" variant="outline" onClick={reconnect}>Reintentar</Button>}</div>
}
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{children}</p>{action}</div>
}
export function TextLink({ to, children }: { to: string; children: ReactNode }) { return <Link className="text-link" to={to}>{children}<ArrowUpRight size={16} /></Link> }
export function SuccessMark() { return <div className="success-mark"><Check size={34} strokeWidth={2.5} /></div> }
export function CarTop({ color = 'silver', className }: { color?: 'silver' | 'blue'; className?: string }) {
  return <svg viewBox="0 0 74 140" className={cn('car-top', color, className)} aria-hidden="true"><path className="car-shadow" d="M13 18Q13 3 37 3T61 18L67 111Q66 133 37 137Q8 133 7 111Z" /><rect x="6" y="30" width="7" height="22" rx="3" fill="#0b0c0e"/><rect x="61" y="30" width="7" height="22" rx="3" fill="#0b0c0e"/><rect x="6" y="101" width="7" height="21" rx="3" fill="#0b0c0e"/><rect x="61" y="101" width="7" height="21" rx="3" fill="#0b0c0e"/><path className="car-body" d="M13 18Q13 3 37 3T61 18L64 111Q64 131 37 134Q10 131 10 111Z"/><path d="M18 24Q37 17 56 24L58 43Q37 34 16 43Z" fill="#11171e"/><path d="M18 49L16 88L21 90L23 49ZM56 49L58 88L53 90L51 49Z" fill="#171e27"/><path d="M22 98H52L56 116Q37 124 18 116Z" fill="#151d25"/><path d="M25 50Q37 46 49 50V91H25Z" fill="currentColor" opacity=".8"/><path d="M17 12L26 9M48 9L57 12" stroke="#e9f3ff" strokeWidth="4" strokeLinecap="round"/><path d="M16 124L25 128M49 128L58 124" stroke="#bd5868" strokeWidth="3" strokeLinecap="round"/><path d="M19 20Q37 14 55 20M17 45L14 96M57 45L60 96" fill="none" stroke="#fff" opacity=".25"/></svg>
}


/** Silueta vectorial horizontal para el plano móvil; no depende de imágenes externas. */
export function CarOverhead({ className }: { className?: string }) {
  return <svg viewBox="0 0 270 126" className={cn('car-overhead', className)} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vehículo visto desde arriba">
    <defs>
      <linearGradient id="car-os-body" x1="0" x2="0.9" y1="0.1" y2="1"><stop stopColor="#fff"/><stop offset=".47" stopColor="#edf3f5"/><stop offset=".8" stopColor="#bdccd4"/><stop offset="1" stopColor="#f7fbfc"/></linearGradient>
      <linearGradient id="car-os-glass" x1="0" x2=".7" y1="0" y2="1"><stop stopColor="#121920"/><stop offset=".6" stopColor="#303e48"/><stop offset="1" stopColor="#0c1218"/></linearGradient>
      <linearGradient id="car-os-roof" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f9feff"/><stop offset=".48" stopColor="#d7e3e9"/><stop offset="1" stopColor="#9eafb9"/></linearGradient>
    </defs>
    {/* Sombra, ruedas y retrovisores. El coche está orientado hacia la derecha. */}
    <path d="M31 28C51 15 72 15 102 17L214 17C237 19 252 31 258 46L262 82C257 104 240 112 214 114H89C55 114 33 108 23 91L13 67L20 44Z" fill="#02070b" opacity=".55" transform="translate(1 5)"/>
    <rect x="49" y="7" width="47" height="19" rx="6" fill="#080d13"/><rect x="49" y="100" width="47" height="19" rx="6" fill="#080d13"/>
    <rect x="181" y="7" width="47" height="19" rx="6" fill="#080d13"/><rect x="181" y="100" width="47" height="19" rx="6" fill="#080d13"/>
    <path d="M30 31Q42 20 74 19H211C232 20 247 33 253 48L255 79Q250 102 213 107H76Q44 106 29 96L21 80Q17 59 22 45Z" fill="url(#car-os-body)" stroke="#78858d" strokeWidth="2.4"/>
    {/* Guardabarros y detalles de panel */}
    <path d="M30 41Q47 31 74 31M29 86Q51 97 74 95M216 29Q240 32 246 51M217 95Q238 94 246 76" stroke="#ffffff" strokeWidth="4.2" fill="none" opacity=".92"/>
    <path d="M31 34Q44 28 68 27M31 91Q48 100 71 100" stroke="#8c9aa4" strokeWidth="1.5" fill="none" opacity=".65"/>
    {/* Cristal trasero y maletero */}
    <path d="M67 31Q79 27 91 29L96 98Q78 101 67 94Q55 81 55 64Q55 46 67 31Z" fill="url(#car-os-glass)" stroke="#71818e" strokeWidth="2"/>
    <path d="M37 43L50 39Q44 62 49 86L36 83Q31 62 37 43Z" fill="#f5f9fa" stroke="#bbc9d3"/>
    {/* Techo: grandes lunas oscuras y panel central claro */}
    <path d="M98 24Q113 19 138 20H184Q207 22 213 38L213 88Q205 104 181 105H138Q112 104 99 101Z" fill="#dbe5eb" stroke="#8394a0" strokeWidth="2"/>
    <path d="M102 32Q124 26 138 27V98Q120 99 102 93Z" fill="url(#car-os-glass)" stroke="#51616e" strokeWidth="1.7"/>
    <path d="M174 27Q202 28 208 41L208 86Q200 98 174 99Z" fill="url(#car-os-glass)" stroke="#51616e" strokeWidth="1.7"/>
    <rect x="140" y="23" width="33" height="79" rx="9" fill="url(#car-os-roof)" stroke="#b2c1c9" strokeWidth="1.5"/>
    <path d="M144 33V93M170 33V93" stroke="#ffffff" strokeWidth="2.2" opacity=".75"/>
    {/* Puertas, marcos y reflejos */}
    <path d="M116 22L111 15M194 22L203 16M112 105L116 112M194 105L204 111" stroke="#657886" strokeWidth="2.3"/>
    <path d="M74 26L77 17M74 98L77 110M213 24L216 16M213 102L215 110" stroke="#8a98a3" strokeWidth="1.8"/>
    <path d="M114 29L131 30M117 95L132 95M178 33L187 34M178 94L188 94" stroke="#edf4f7" strokeWidth="2.5" strokeLinecap="round" opacity=".9"/>
    <path d="M86 27Q100 22 114 24M85 99Q101 105 113 102" stroke="#ffffff" strokeWidth="3" fill="none" opacity=".8"/>
    {/* Espejos laterales y focos */}
    <path d="M196 18L202 10Q210 9 216 13L218 21Z" fill="#e5edf1" stroke="#6c7d89" strokeWidth="1.4"/>
    <path d="M196 107L203 116Q211 117 216 112L219 104Z" fill="#e5edf1" stroke="#6c7d89" strokeWidth="1.4"/>
    <path d="M242 36Q249 40 251 48L244 49L236 40Z" fill="#e3fcff" stroke="#8dabb5"/>
    <path d="M244 78L251 78Q249 87 241 91L236 86Z" fill="#e3fcff" stroke="#8dabb5"/>
    <path d="M23 40L31 38L35 50L24 53Z" fill="#d9535f"/><path d="M24 73L35 77L31 90L22 87Z" fill="#d9535f"/>
    <path d="M216 61H245" stroke="#c1cdd3" strokeWidth="2.2" opacity=".7"/>
  </svg>
}
