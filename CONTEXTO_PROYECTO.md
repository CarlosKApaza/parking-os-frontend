# Parking OS — Continuidad del proyecto

Actualizado el 24 de noviembre de 2026. Proyecto académico de Sistemas de Tiempo Real, COM460/SIS460, USFX. Estado basado en las pruebas y capturas comunicadas por el estudiante; las integraciones aún pendientes no se consideran terminadas.

## Frontend PWA

Repositorio: https://github.com/CarlosKApaza/parking-os-frontend
Rama de trabajo: feat/payments-profile-history, derivada de feat/mobile-spaces-ux. No se ha fusionado a main en esta etapa.

React + TypeScript + Vite, Manrope, lucide-react, Motion. Preferencia: actualizar desde GitHub por terminal y comprobar visualmente en el navegador/VS Code; no reemplazar módulos funcionales innecesariamente.

- Inicio: disponibilidad de 7 plazas, automóvil blanco, contadores y accesos rápidos.
- Espacios: P1–P7, plano, estados de sensores, selección y reserva.
- Pago de salida: ticket de prueba, resumen, confirmación animada, comprobante e historial local. Tickets DEMO-0042 (Bs 7,50 / 90 min), DEMO-0041 y DEMO-0040 (Bs 5,00 / 60 min). No son cobros bancarios.
- Perfil: tarjeta con automóvil y datos dinámicos, historial y reservas en dos tarjetas, accesos vehículos, billetera y cámaras.
- Reservas, billetera, vehículos y diálogos: diseño unificado. Reservas activas azules, finalizadas verdes, canceladas gris azulado con etiqueta rosada.
- Seguridad: dos cámaras en red local, selector y controles de video; entrada esmeralda, salida azul. No confundir el color de zona con la señal real.
- Paleta: fondo #07141d / #08111a / #061b1d, verde menta #a1f5d5, azul #527cf5, superficies esmeralda y azul petróleo. Interfaz compacta, poca explicación repetida, conservar estética móvil.
- Validación visual previa por el usuario de Inicio, Espacios, Seguridad y Perfil. Última revisión visual y npm test / npm run build pendientes en su equipo.

Comandos desde frontend:
```bash
git status
git pull --ff-only origin feat/payments-profile-history
npm run dev
npm test
npm run build
```

## Cámaras y OCR (módulo separado)

Ruta local comunicada: Proyecto_Estacionamiento_Final/prueba_camara_usb/parking_camaras. Python 3.14, OpenCV, Tesseract, ROI, Facade, transmisión MJPEG, CSV y pruebas unittest. Cámara entrada UVC puerto 8765; cámara salida W77 puerto 8766. Panel técnico http://127.0.0.1:8765/panel.
El usuario comprobó reconocimiento automático de 8520PHD en ambas cámaras. Se aplicó ajuste para cuatro coincidencias consecutivas; falta confirmar número efectivo en terminal (el pie del panel mostraba tres en una captura). No confundir reconocimiento con autorización de acceso. Mantener panel técnico para diagnóstico.

Comando de ejecución comunicado:
```powershell
py -3.14 -u .\main.py --entrada 1 --salida 2 --backend dshow --fps 20 --quality 70
```

## Siguiente etapa

1. Validar build y pruebas del frontend y terminar los últimos retoques visuales.
2. Conectar eventos de matrícula confirmada y zona desde Python a NestJS con autenticación, identificación de evento y deduplicación.
3. Vincular entradas/salidas a sesiones, reservas y pagos en MySQL; no usar pagos ficticios de localStorage para autorizar barreras.
4. Integrar sensores infrarrojos y barreras ESP32; comprobar permisos y condiciones de seguridad. Medir latencia, pérdida de conexión y recuperación.
5. Validar flujo integral en maqueta y documentar resultados. Conservar las piezas ya operativas.

No se ha modificado NestJS, MySQL, ESP32 ni Python OCR en los commits de diseño del frontend. No dar por completada la integración física hasta probarla.

## WebSockets — fase de ocupación

Se añadió Gateway Socket.IO en backend (rama feat/camaras-ocr, puerto 3000, ruta /socket.io) y cliente en frontend (feat/payments-profile-history). Evento estacionamiento.actualizado por cada lectura confirmada en MySQL, incluidos reportes sin cambio. REST para estado inicial, reconexión y respaldo cada 3 s exclusivamente si el socket no está sano. Antigüedad calculada localmente. Proxy WebSocket en Vite, sin modificar ESP32, cámaras ni UI. Pendiente instalar nuevas dependencias del backend, compilar y validar con dos pestañas/ESP32. El OCR, pagos, reservas y barreras aún no se difunden por Socket.IO.

## Autenticación de clientes
Backend feat/gestion-estacionamiento: modelo 14 tablas migrado y login JWT, GET /auth/me, GET /vehiculos y rechazo 401 sin JWT verificados por el usuario en Insomnia. Frontend nueva rama feat/auth-clientes: splash, bienvenida, registro, login, invitado, perfil y vehículos desde API, saldo ficticio real de MySQL. JWT y expiración en sessionStorage por pestaña, validación al restaurar mediante /auth/me; no se guarda contraseña ni perfil. Sin premium ni tokens monetarios en pantallas activas. Reservas, recargas, pagos e historial de pagos aún no tienen API integrada: se deshabilitan acciones locales para evitar mezclar cuentas. El diseño previo de demo queda en feat/payments-profile-history. WebSocket de ocupación preservado. Tarifas iniciales Bs15/h, lectura dinámica pendiente. PCB pendiente y prueba física de eventos pendiente.

Pruebas del 24/11: Alex en PC y Daniel en Android autenticados con perfiles distintos; cambio a WhatsApp podía perder sesión por descarte de la página. Se corrige persistencia de sesión por pestaña. Las reservas siguen pendientes: ningún evento de selección/reserva compartida, ni retención global, hasta implementar servicio transaccional y Gateway. Prueba física del ESP32 pendiente por PCB.

## Reservas concurrentes
Backend y frontend conectados con retenciones de 30 s, transacciones MySQL, evento público reservas.actualizadas (invalida snapshot REST), recuperación al reconectar y lista privada por JWT. La plaza futura reservada se muestra azul y permite consultar horarios alternativos si físicamente libre. Retención ajena ámbar; propia azul. No se cobra al reservar. Vehículos demo verificados; nuevas matrículas requieren verificación. Prueba entre PC/celular pendiente. Android conservar sesión al volver de WhatsApp confirmado por usuario.
