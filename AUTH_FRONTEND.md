# Acceso de clientes

Rama feat/auth-clientes basada en feat/payments-profile-history. Backend debe ejecutar feat/gestion-estacionamiento (b345ec6 o posterior), MySQL y seed demo. En frontend npm run build, npm test y npm run dev -- --host 0.0.0.0. No dependencias nuevas.

La primera visita a Inicio muestra splash breve y bienvenida; /bienvenida siempre accesible manualmente. Login y registro separados. Invitados ven Inicio, Espacios y Seguridad; perfil público ofrece login. Rutas personales protegidas. API por proxy Vite /api/auth, /api/usuarios, /api/vehiculos; despliegue real requiere proxy HTTPS. JWT en memoria, se pierde al recargar, expira en una hora, 401 cierra sesión. No almacenar tokens en localStorage. No compartir credenciales reales en HTTP de feria.

Probar Alex alex@parkingos.test, María maria@parkingos.test, Daniel daniel@parkingos.test, contraseña demo Parking123*. Dos pestañas independientes. Verificar vehículos y saldo (150/100/200), editar nombre, registrar placa nueva y comprobar aislamiento. Cerrar sesión y volver a entrar. Recarga solicita sesión al entrar a una ruta protegida. Verificar invitado y login al seleccionar plaza. No hay reserva ni cobro efectivo en esta fase, ni uso de saldos o tickets locales. No se eliminan datos de localStorage; rama previa conserva simulación visual completa. No modificar backend/firmware en esta fase.
