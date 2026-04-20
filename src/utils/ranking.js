const { EmbedBuilder } = require('discord.js');
const {
  topTrabajadores,
  obtenerConfiguracion,
  obtenerRankingMessageId,
  guardarRankingMessageId
} = require('../database/db');
const { formatearMinutos } = require('./format');
const { COLORS, FOOTERS } = require('./theme');

function medal(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return '🏅';
}

function crearLineaRanking(u, i) {
  return [
    `${medal(i)} **PUESTO ${i + 1}**`,
    `👤 Trabajador: <@${u.user_id}>`,
    `⏱️ Tiempo acumulado: **${formatearMinutos(u.total_minutos)}**`,
    `📁 Jornadas cerradas: **${u.total_jornadas}**`
  ].join('\n');
}

function crearEmbedRanking(guildId) {
  const top = topTrabajadores(guildId, 10);

  const descripcion = top.length
    ? top.map((u, i) => crearLineaRanking(u, i)).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n')
    : 'No existen registros acumulados en el sistema.';

  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏆 Leaderboard Laboral Oficial')
    .setDescription(
      [
        '📊 **CLASIFICACIÓN GENERAL DE DESEMPEÑO LABORAL**',
        '',
        descripcion
      ].join('\n')
    )
    .addFields(
      { name: '📌 Estado', value: 'Actualización automática', inline: true },
      { name: '👥 Top mostrado', value: '10 trabajadores', inline: true },
      { name: '🗂️ Sistema', value: 'Leaderboard institucional', inline: true }
    )
    .setFooter({ text: FOOTERS.ranking })
    .setTimestamp();
}

async function actualizarRankingEnCanal(guild) {
  try {
    const config = obtenerConfiguracion(guild.id);
    const rankingChannelId = config?.ranking_channel_id;
    if (!rankingChannelId) return;

    const canal = guild.channels.cache.get(rankingChannelId);
    if (!canal) return;

    const embed = crearEmbedRanking(guild.id);
    const rankingMessageId = obtenerRankingMessageId(guild.id);

    if (rankingMessageId) {
      try {
        const mensaje = await canal.messages.fetch(rankingMessageId);
        await mensaje.edit({ embeds: [embed] });
        return;
      } catch (_) {}
    }

    const nuevoMensaje = await canal.send({ embeds: [embed] });
    guardarRankingMessageId(guild.id, nuevoMensaje.id);
  } catch (error) {
    console.error('❌ Error actualizando ranking:', error);
  }
}

module.exports = {
  actualizarRankingEnCanal,
};