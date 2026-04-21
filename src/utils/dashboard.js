const { EmbedBuilder } = require('discord.js');
const {
  obtenerConfiguracion,
  topTrabajadores,
  getUltimaRevision,
  obtenerJornadasActivas,
  obtenerTodasLasJornadas,
} = require('../database/db');
const { formatearMinutos } = require('./format');
const { COLORS, FOOTERS } = require('./theme');

async function renderDashboardLight(client, guildId) {
  try {
    const config = obtenerConfiguracion(guildId);
    if (!config?.ranking_channel_id || !config?.ranking_message_id) return;

    const channel = await client.channels.fetch(config.ranking_channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const msg = await channel.messages.fetch(config.ranking_message_id).catch(() => null);
    if (!msg) return;

    const top = topTrabajadores(guildId, 5);
    const activas = obtenerJornadasActivas(guildId);
    const jornadas = obtenerTodasLasJornadas(guildId);

    const totalJornadas = jornadas.length;
    const jornadasCerradas = jornadas.filter(j => j.estado === 'cerrado').length;
    const totalMinutos = jornadas.reduce((acc, j) => acc + (j.minutos_trabajados || 0), 0);

    let revisionTexto = 'Sin revisión registrada.';
    if (top.length > 0) {
      const revision = getUltimaRevision(guildId, top[0].user_id);
      if (revision?.last_review_ts) {
        revisionTexto = `<t:${Math.floor(revision.last_review_ts / 1000)}:R>`;
      }
    }

    const rankingTexto = top.length
      ? top.map((t, i) => {
          const icono =
            i === 0 ? '🥇' :
            i === 1 ? '🥈' :
            i === 2 ? '🥉' :
            '🏅';

          return [
            `${icono} **${i + 1}. ${t.username}**`,
            `⏱️ ${formatearMinutos(t.total_minutos)} | 📁 ${t.total_jornadas} jornadas`,
          ].join('\n');
        }).join('\n\n')
      : 'Sin datos registrados.';

    const liderTexto = top.length
      ? `<@${top[0].user_id}>`
      : 'Sin líder actual';

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📊 Dashboard Operativo Institucional')
      .setDescription(
        [
          'Resumen automático del estado laboral del servidor.',
          '',
          'Este panel se actualiza con base en los movimientos registrados por el sistema.',
        ].join('\n')
      )
      .addFields(
        {
          name: '🟢 Personal activo',
          value: String(activas.length),
          inline: true,
        },
        {
          name: '📁 Jornadas totales',
          value: String(totalJornadas),
          inline: true,
        },
        {
          name: '✅ Jornadas cerradas',
          value: String(jornadasCerradas),
          inline: true,
        },
        {
          name: '⏱️ Tiempo acumulado general',
          value: formatearMinutos(totalMinutos),
          inline: true,
        },
        {
          name: '🥇 Líder actual',
          value: liderTexto,
          inline: true,
        },
        {
          name: '🪪 Última revisión del Top 1',
          value: revisionTexto,
          inline: true,
        },
        {
          name: '🏆 Top 5 institucional',
          value: rankingTexto,
        }
      )
      .setFooter({ text: FOOTERS.system || FOOTERS.official })
      .setTimestamp();

    await msg.edit({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    console.error('❌ Error al renderizar dashboard ligero:', error);
  }
}

module.exports = {
  renderDashboardLight,
};