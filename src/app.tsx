import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { ParkingProvider } from '@/context/parking-context'
import { Layout } from '@/components/layout'
import { HomePage } from '@/pages/home'
import { SpacesPage } from '@/pages/spaces'
import { BookingPage, ReservationsPage } from '@/pages/reservations'
import { WalletPage } from '@/pages/wallet'
import { PaymentPage } from '@/pages/payment'
import { SecurityPage } from '@/pages/security'
import { ProfilePage, VehiclesPage } from '@/pages/profile'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared'
import { MapPin } from 'lucide-react'

export default function App() {
  return <BrowserRouter><MotionConfig reducedMotion="user"><ParkingProvider><Routes><Route element={<Layout/>}>
    <Route index element={<HomePage/>}/><Route path="espacios" element={<SpacesPage/>}/><Route path="reservar" element={<BookingPage/>}/><Route path="reservas" element={<ReservationsPage/>}/><Route path="billetera" element={<WalletPage/>}/><Route path="pago" element={<PaymentPage/>}/><Route path="seguridad" element={<SecurityPage/>}/><Route path="perfil" element={<ProfilePage/>}/><Route path="vehiculos" element={<VehiclesPage/>}/>
    <Route path="*" element={<EmptyState icon={<MapPin size={34}/>} title="Este camino no lleva a una plaza" action={<Button asChild><Link to="/">Volver al inicio</Link></Button>}>La página que buscas no está disponible.</EmptyState>}/>
  </Route></Routes></ParkingProvider></MotionConfig></BrowserRouter>
}
