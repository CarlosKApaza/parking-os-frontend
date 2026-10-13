# Parking OS — Cliente PWA

Frontend independiente en React + TypeScript + Vite. Implementa el wireframe del cliente con una paleta carbón, azul y blanco inspirada en la imagen de referencia. Todo el código está en `frontend_clientePWA`; no necesita iniciar ni modificar `servidor_backend` para explorar la demo.

## Ejecutar

Requiere Node.js 22.12+ o 24 LTS y npm. En una terminal ubicada en esta carpeta:

```powershell
npm install
npm run dev
```

Abre **http://127.0.0.1:5173/**. Las dependencias ya están instaladas en esta entrega. Si PowerShell restringe `npm.ps1`, utiliza `npm.cmd` en los mismos comandos.

```powershell
npm test        # Pruebas de dominio y adaptación de datos
npm run build  # TypeScript y compilación de producción en dist/
npm run preview
```

La vista previa de producción está en **http://127.0.0.1:4173/**. No abras `dist/index.html` con doble clic: las rutas y el service worker necesitan HTTP/HTTPS.

## Pantallas

| Ruta | Función |
| --- | --- |
| `/` | Billetera compacta, disponibilidad, pago rápido y próxima reserva; sin mapa |
| `/espacios` | Plano 2D y lista de P1–P7, selección, estado y acceso a reservas |
| `/reservar?plaza=P1` | Fecha, llegada y salida; validación de horarios y conflictos |
| `/reservas` | Reservas activas, detalle y cancelación; historial con búsqueda y filtros |
| `/billetera` | Saldo, tokens, planes y movimientos; pestaña opcional `?tab=planes` |
| `/pago` | Ticket de prueba `DEMO-0042`, resumen, pago simulado y confirmación |
| `/seguridad` | Presentación de Parking Plus y dos cámaras sin transmisión |
| `/perfil` | Nombre de demo, accesos y simulador de sensor/conectividad |
| `/vehiculos` | Alta y eliminación de vehículos ficticios, con placas sin verificar |

La navegación es inferior en móvil y lateral en escritorio. Los diálogos usan Radix/shadcn, gestionan el foco y pueden cerrarse con Escape. Se respeta la preferencia de movimiento reducido.

## Demo e integración

El modo predeterminado es **demo**. No realiza solicitudes a tu backend. Los datos de prueba se guardan en `localStorage`, clave `parkingos:demo:v1`, y se actualizan entre pestañas del mismo origen. Si el almacenamiento está bloqueado, la demo sigue durante la sesión. Los datos de 5173 y 4173 son independientes.

Las reservas futuras no ocupan una plaza antes de su horario. El estado físico tiene prioridad sobre la reserva comercial. Las reservas vencidas pasan a historial, y un ticket ya pagado no descuenta saldo por segunda vez. Son comprobaciones locales para la demo, no sustituyen transacciones ni autorización del servidor.

En **Perfil → Herramientas de demostración** puedes alternar P2 y simular pérdida de señal. La pérdida de señal convierte todas las plazas en «Sin confirmar», nunca en «Libre».

Cuando el contrato del servidor esté listo, copia `.env.example` a `.env.local`, configura las direcciones y cambia:

```dotenv
VITE_DATA_MODE=live
VITE_API_URL=http://localhost:3000
VITE_SPACES_PATH=/api/spaces
VITE_SOCKET_URL=http://localhost:3000
VITE_SOCKET_PATH=/socket.io
VITE_PARKING_EVENT=parking.updated
VITE_DEVICE_EVENT=device.status
VITE_STALE_AFTER_MS=30000
```

Reinicia Vite al cambiar variables. Las variables `VITE_` son públicas: no deben contener secretos. En `live`, la aplicación consulta la disponibilidad real y desactiva las operaciones comerciales de demo. No mezcla saldo ni reservas ficticias con datos reales. Las cuentas reales, reservas, pagos, permisos de cámara y vehículos requieren sus correspondientes servicios.

### Contrato preparado de solo lectura

`GET /api/spaces` puede devolver una lista directamente o `{ "spaces": [...] }` / `{ "data": [...] }`:

```json
[
  { "code": "P1", "occupancyStatus": "FREE", "updatedAt": "2026-10-11T12:00:00Z", "sequence": 1 },
  { "code": "P2", "occupancyStatus": "OCCUPIED", "updatedAt": "2026-10-11T12:00:00Z", "sequence": 2 }
]
```

Envía las siete plazas. Las ausentes aparecen sin confirmar. El adaptador acepta identificadores `code`, `spaceId` o `id` con valores P1–P7; estados físicos `physicalOccupancy`, `occupancyStatus`, `occupancy_status` o `status`; fechas `updatedAt`, `updated_at` o `timestamp`. Solo `FREE` y `OCCUPIED` se consideran estados físicos confirmados; otros valores son `UNKNOWN`. Si tus identificadores son numéricos, entrega además `code` o adapta `src/services/parking.ts`.

El evento `parking.updated` acepta una plaza con ese mismo formato o una lista. El evento `device.status` acepta `{ "status": "online" }`, `{ "status": "offline" }`, equivalentes `connected`/`disconnected`, `connectivity`, o `{ "online": true }`. Solo publica online cuando los sensores estén realmente disponibles.

La conexión Socket.IO fuerza una consulta REST inicial y otra al reconectar. Los eventos que llegan durante la consulta se conservan y se concilian con el snapshot. Se descartan secuencias repetidas/anteriores y timestamps atrasados. Se asume una secuencia creciente por plaza dentro de la sesión; el snapshot de reconexión permite restablecerla tras reiniciar el servidor.

Sin eventos ni heartbeat durante el tiempo configurado, la interfaz invalida la disponibilidad y espera la siguiente señal. El heartbeat debería ser más frecuente que `VITE_STALE_AFTER_MS`. El servidor debe configurar CORS para el origen del frontend. No se realizó ninguna modificación ni prueba contra `servidor_backend`; el adaptador sigue el contrato propuesto en los documentos y debe contrastarse con la API definitiva.

## PWA

Vite PWA genera el manifest, service worker, precaché de la interfaz, iconos PNG 192/512, icono maskable y apple-touch-icon. La aplicación puede abrir su interfaz sin red tras una primera carga de producción. **No almacena respuestas de la API en el service worker**. Sin conexión, el modo real no publica plazas libres.

Para probar instalación, ejecuta `npm run build` y `npm run preview` en un navegador compatible. En producción requiere HTTPS; localhost se admite para desarrollo. La disponibilidad del botón de instalación depende del navegador. Se incluye una guía para Safari/iOS y un aviso de nueva versión que permite al usuario decidir cuándo actualizar.

El servidor estático de producción debe devolver `index.html` en rutas del cliente (`/espacios`, `/reservas`, etc.), sin reescribir rutas de API. Los recursos usan la raíz `/`; configura `base`, `scope`, rutas de iconos y `BrowserRouter` si alojas en un subdirectorio.

## Límites de esta entrega

No incluye panel administrativo, backend, firmware, pasarela bancaria, cámara/lector QR real, reconocimiento de placas, transmisión de video ni escena 3D. El lector utiliza un ticket fijo y los pagos son ilustrativos. Activar Plus en la demo no concede acceso a ninguna cámara. La vista 3D se señala como próxima, conservando el plano 2D.

## Estructura

```text
src/
  components/       Navegación, plano auxiliar, piezas compartidas y UI shadcn
  context/          Estado y operaciones de demo
  hooks/            Conexión Socket.IO e instalación PWA
  lib/              Tipos, reglas de reservas, pago idempotente y utilidades
  pages/            Pantallas del cliente
  services/         Adaptador REST/Socket.IO configurable
  styles.css        Diseño y breakpoints móviles
public/             Identidad e iconos PWA locales
tests/              Validación de reglas y normalización de datos
```

Referencias técnicas: [Vite PWA](https://vite-pwa-org.netlify.app/guide/), [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite) y [shadcn con Vite](https://ui.shadcn.com/docs/installation/vite).
