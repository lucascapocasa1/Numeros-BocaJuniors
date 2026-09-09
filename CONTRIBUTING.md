# Contribuir a Números Rojos

Gracias por tu interés en contribuir. Este proyecto es de datos abiertos y cualquier mejora es bienvenida, tanto si sos hincha de Independiente como si representás a otro club y querés adaptarlo.

## ¿Cómo puedo contribuir?

### Reportar un error
Usá el [formulario de bug report](.github/ISSUE_TEMPLATE/bug_report.md) en Issues. Incluí pasos para reproducirlo y, si podés, una captura de pantalla.

### Sugerir una mejora
Abrí un Issue con la etiqueta `enhancement` describiendo qué problema resuelve la mejora.

### Contribuir código

1. Hacé un fork del repositorio
2. Creá una rama descriptiva: `git checkout -b feature/nueva-funcionalidad`
3. Realizá tus cambios siguiendo las convenciones del proyecto (ver abajo)
4. Asegurate de que el proyecto corra correctamente con `make up`
5. Abrí un Pull Request contra `main` completando la plantilla

## Convenciones

### Backend (Lumen / PHP)
- PSR-12 para estilo de código
- Controladores en `app/Http/Controllers/Api/V1/`
- Lógica de negocio en servicios (`app/Services/`)
- Toda nueva tabla debe incluir su migración y seeder

### Frontend (React)
- Componentes en PascalCase
- Un componente por archivo
- Estilos con TailwindCSS, sin CSS custom salvo casos justificados
- Las llamadas a la API van en `src/api/`

## Adaptar el proyecto para otro club

Si querés replicar Números Rojos para tu institución, el punto de partida es:

1. Cambiar las referencias al club en el frontend (principalmente en `HomePage.jsx` y `Footer.jsx`)
2. Ajustar los seeders en `backend/database/seeders/` con datos de tu club
3. Configurar las variables de entorno en `.env` y `backend/.env`
4. Opcionalmente, reemplazar la integración de BeSoccer si usás otra fuente de estadísticas

Si tenés dudas, abrí un Issue con la etiqueta `adaptacion-club` y te ayudamos.

## Código de conducta

Este proyecto adhiere al [Contributor Covenant](CODE_OF_CONDUCT.md). Esperamos que todos los participantes lo respeten.
