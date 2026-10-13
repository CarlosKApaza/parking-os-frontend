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
  const { stats, confirmed, isDemo } = useParkingStore()
  return <section className={cn('availability-section', compact && 'compact')} aria-label="Disponibilidad de las siete plazas">
    <div className="section-heading"><h2>Un lugar para ti</h2><span className="live-label"><i className={confirmed ? '' : 'offline'} />{confirmed ? isDemo ? 'Disponibilidad simulada' : 'Conectado' : 'Sin confirmar'}</span></div>
    <div className="stats-grid">{(['free', 'occupied', 'reserved'] as const).map((status, index) => <div className={cn('stat-card', status)} key={status}><div className="stat-label"><span className="stat-dot" />{['Libres', 'Ocupados', 'Reservados'][index]}</div><div className="stat-number">{String(stats[status]).padStart(2, '0')}<span>/ 07</span></div><div className="stat-track"><span style={{ width: `${stats[status] / 7 * 100}%` }} /></div></div>)}</div>
    {stats.unknown > 0 && <p className="unknown-caption">{stats.unknown} de 7 plazas sin confirmar; no se consideran libres.</p>}
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
