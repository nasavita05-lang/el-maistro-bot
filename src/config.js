require('dotenv').config();

const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',

  botName: process.env.BOT_NAME || 'EL MAISTRO',
  timezone: process.env.TIMEZONE || 'America/Mexico_City',

  nodeEnv: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true',

  panelChannelId: process.env.PANEL_CHANNEL_ID || '',
  logChannelId: process.env.LOG_CHANNEL_ID || '',
  rankingChannelId: process.env.RANKING_CHANNEL_ID || '',
};

const requiredVars = [
  ['DISCORD_TOKEN', config.token],
  ['CLIENT_ID', config.clientId],
];

const missingVars = requiredVars
  .filter(([, value]) => !value || !String(value).trim())
  .map(([name]) => name);

if (missingVars.length > 0) {
  throw new Error(
    `Faltan variables obligatorias en el archivo .env: ${missingVars.join(', ')}`
  );
}

module.exports = config;