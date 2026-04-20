const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token, debug, botName } = require('./config');
const { asegurarPanelFijo } = require('./utils/panel');
const { iniciarRespaldoAutomatico } = require('./utils/autoBackup');
const {
  registrarGuildSiNoExiste,
  obtenerConfiguracionEfectiva,
} = require('./database/db');

require('./database/db');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

function cargarComandos() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command?.data?.name || typeof command.execute !== 'function') {
      console.warn(`⚠️ Comando ignorado por formato inválido: ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }
}

function cargarEventos() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event?.name || typeof event.execute !== 'function') {
      console.warn(`⚠️ Evento ignorado por formato inválido: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

cargarComandos();
cargarEventos();

client.once('ready', async () => {
  console.log(`✅ ${botName} encendido como ${client.user.tag}`);
  console.log(`📦 Comandos cargados: ${client.commands.size}`);

  try {
    const guilds = await client.guilds.fetch();

    for (const [, guildPreview] of guilds) {
      try {
        const guild = await client.guilds.fetch(guildPreview.id);
        await guild.channels.fetch();

        registrarGuildSiNoExiste(guild);

        const config = obtenerConfiguracionEfectiva(guild.id);

        if (!config.system_enabled) {
          console.log(`⏸️ Sistema deshabilitado en: ${guild.name}`);
          continue;
        }

        await asegurarPanelFijo(guild);

        const BACKUP_INTERVAL_MS = 20 * 60 * 1000;
        iniciarRespaldoAutomatico(guild, BACKUP_INTERVAL_MS);

        console.log(`✅ Sistema inicializado en: ${guild.name}`);
      } catch (guildError) {
        console.error(`❌ Error inicializando guild ${guildPreview.id}:`, guildError);
      }
    }
  } catch (error) {
    console.error('❌ Error al iniciar sistema multiservidor:', error);
  }
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
});

if (debug) {
  console.log('🛠️ Modo debug activado.');
}

client.login(token).catch(error => {
  console.error('❌ Error al iniciar sesión del bot:', error);
});