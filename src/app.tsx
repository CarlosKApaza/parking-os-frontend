import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { ParkingProvider } from '@/context/parking-context'
import { AuthProvider } from '@/context/auth-context'
import { Layout } from '@/components/layout'
import { HomePage } from '@/pages/home'
import { SpacesPage } from '@/pages/spaces'
import { BookingPage, ReservationsPage } from '@/pages/reservations'
import { PaymentPage } from '@/pages/payment'
import { PaymentHistoryPage } from '@/pages/payment-history'
import { SecurityPage } from '@/pages/security'
import { ProfilePage, VehiclesPage, RealWalletPage } from '@/pages/profile'
import { AuthPage, InitialHome, WelcomePage, RequireAuth } from '@/pages/auth'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared'
import { MapPin } from 'lucide-react'

export default function App() {
  return <BrowserRouter><MotionConfig reducedMotion="user"><AuthProvider><ParkingProvider><Routes>
    <Route path="bienvenida" element={<WelcomePage/>}/><Route path="login" element={<AuthPage key="login"/>}/><Route path="registro" element={<AuthPage key="register" register/>}/>
    <Route element={<Layout/>}>
    <Route index element={<InitialHome><HomePage/></InitialHome>}/><Route path="espacios" element={<SpacesPage/>}/><Route path="reservar" element={<RequireAuth><BookingPage/></RequireAuth>}/><Route path="reservas" element={<RequireAuth><ReservationsPage/></RequireAuth>}/><Route path="billetera" element={<RequireAuth><RealWalletPage/></RequireAuth>}/><Route path="pago" element={<PaymentPage/>}/><Route path="seguridad" element={<SecurityPage/>}/><Route path="perfil" element={<ProfilePage/>}/><Route path="perfil/pagos" element={<RequireAuth><PaymentHistoryPage/></RequireAuth>}/><Route path="vehiculos" element={<RequireAuth><VehiclesPage/></RequireAuth>}/>
    <Route path="*" element={<EmptyState icon={<MapPin size={34}/>} title="Este camino no lleva a una plaza" action={<Button asChild><Link to="/">Volver al inicio</Link></Button>}>La página que buscas no está disponible.</EmptyState>}/>
  </Route></Routes></ParkingProvider></AuthProvider></MotionConfig></BrowserRouter>
}
