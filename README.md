# EL MAISTRO BOT

Bot de Discord para registrar entrada, salida, horas acumuladas e historial de servicio.

## 1) Requisitos
- Node.js 18 o superior
- Un bot de Discord creado en el portal de desarrolladores

## 2) Instalar
```bash
npm install
```

## 3) Configurar `.env`
Abre el archivo `.env` y llena esto:

```env
DISCORD_TOKEN=TU_TOKEN_AQUI
CLIENT_ID=TU_CLIENT_ID_AQUI
GUILD_ID=TU_GUILD_ID_AQUI
BOT_NAME=EL MAISTRO
TIMEZONE=America/Mexico_City
```

### ¿De dónde sale cada dato?
- `DISCORD_TOKEN`: Bot > Reset Token / Token del bot
- `CLIENT_ID`: General Information > Application ID
- `GUILD_ID`: ID de tu servidor de Discord

## 4) Invitar el bot
En el portal de Discord, dale permisos mínimos:
- View Channels
- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History

## 5) Registrar comandos
```bash
npm run deploy
```

## 6) Encender bot
```bash
npm start
```

## 7) Comandos disponibles
- `/entrar` → Inicia sesión de servicio
- `/salir` → Cierra sesión y suma minutos
- `/horas` → Ve horas acumuladas tuyas o de otro usuario
- `/historial` → Ve las últimas sesiones
- `/panel` → Publica panel con botones

## 8) Base de datos
Se crea automáticamente un archivo:
- `data.sqlite`

Ahí se guardan:
- sesiones activas y cerradas
- horas acumuladas por usuario

## 9) Flujo de uso recomendado
1. Usa `/panel` en el canal donde quieras dejar el sistema fijo.
2. Los usuarios pueden usar botones o comandos.
3. El bot guarda todo en SQLite.

## 10) Notas
- Si un usuario ya está activo, no puede volver a entrar hasta usar `/salir`.
- Si un usuario intenta salir sin haber entrado, el bot se lo indica.
- El tiempo se guarda en minutos y se muestra como horas y minutos.
