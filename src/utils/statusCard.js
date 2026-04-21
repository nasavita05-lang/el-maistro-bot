const { EmbedBuilder } = require('discord.js');

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function buildStatusEmbed(client, interaction) {
  const guildCount = client.guilds.cache.size;
  const userCount = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
  const commandCount = client.commands?.size || 0;
  const ping = Math.max(0, Math.round(client.ws.ping));
  const uptime = formatUptime(client.uptime || 0);
  const memory = formatBytes(process.memoryUsage().rss);
  const nodeVersion = process.version;
  const environment = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'development';

  return new EmbedBuilder()
    .setColor(0x0b5394)
    .setTitle('📊 Estado general de EL MAISTRO')
    .setDescription('Resumen institucional del sistema en ejecución.')
    .addFields(
      { name: '🤖 Bot', value: client.user?.tag || 'No disponible', inline: true },
      { name: '🌐 Servidores', value: String(guildCount), inline: true },
      { name: '👥 Usuarios', value: String(userCount), inline: true },

      { name: '⚡ Ping', value: `${ping} ms`, inline: true },
      { name: '🧠 Memoria', value: memory, inline: true },
      { name: '⏱️ Uptime', value: uptime, inline: true },

      { name: '🧩 Comandos', value: String(commandCount), inline: true },
      { name: '🟩 Entorno', value: String(environment), inline: true },
      { name: '🟦 Node', value: nodeVersion, inline: true },

      {
        name: '🏛️ Servidor actual',
        value: interaction.guild?.name
          ? `${interaction.guild.name}\nID: ${interaction.guild.id}`
          : 'Uso en DM o no disponible',
        inline: false,
      }
    )
    .setFooter({
      text: 'EL MAISTRO • Estado institucional del sistema',
    })
    .setTimestamp();
}

module.exports = {
  buildStatusEmbed,
};
