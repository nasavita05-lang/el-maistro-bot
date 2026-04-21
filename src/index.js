require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

/**
 * =========================
 * CARGA DE COMANDOS
 * =========================
 */
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.info('Comando cargado', {
      file,
      command: command.data.name,
    });
  } else {
    logger.warn('Comando ignorado por formato inválido', { file });
  }
}

/**
 * =========================
 * CARGA DE EVENTOS
 * =========================
 */
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (!event?.name || typeof event.execute !== 'function') {
    logger.warn('Evento ignorado por formato inválido', { file });
    continue;
  }

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }

  logger.info('Evento cargado', {
    file,
    event: event.name,
    once: Boolean(event.once),
  });
}

/**
 * =========================
 * READY
 * =========================
 */
client.once('ready', readyClient => {
  logger.ready('EL MAISTRO conectado correctamente', {
    bot: readyClient.user.tag,
    guilds: readyClient.guilds.cache.size,
  });
});

client.login(process.env.DISCORD_TOKEN);