require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    logger.warn('Comando omitido en deploy por formato inválido', { file });
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info('Iniciando registro de comandos slash', {
      total: commands.length,
    });

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    logger.ready('Comandos slash registrados correctamente', {
      guildId: process.env.GUILD_ID,
      total: commands.length,
    });
  } catch (error) {
    logger.error('Error al registrar comandos slash', {
      message: error?.message,
    });
    process.exit(1);
  }
})();