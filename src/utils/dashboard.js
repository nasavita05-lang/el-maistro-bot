const { EmbedBuilder } = require('discord.js');
const {
  obtenerConfiguracion,
  topTrabajadores,
  getUltimaRevision,
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

    let extra = '';
    if (top.length > 0) {
      const revision = getUltimaRevision(guildId, top[0].user_id);
      if (revision?.last_review_ts) {
        extra = `\n🪪 Última revisión del Top 1: <t:${Math.floor(revision.last_review_ts / 1000)}:R>`;
      }
    }

    const rankingTexto = top.length
      ? top
          .map((t, i) => {
            const icono =
              i === 0 ? '🥇' :
              i === 1 ? '🥈' :
              i === 2 ? '🥉' :
              '🏅';

            return `${icono} ${i + 1}. ${t.username} — ${formatearMinutos(t.total_minutos)} (${t.total_jornadas} jornadas)`;
          })
          .join('\n')
      : 'Sin datos registrados.';

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📊 PANEL OPERATIVO')
      .setDescription(`Actualización ligera del sistema.${extra}`)
      .addFields({
        name: '🏆 Top 5',
        value: rankingTexto,
      })
      .setFooter({ text: FOOTERS.system })
      .setTimestamp();

    await msg.edit({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    console.error('❌ Error al renderizar dashboard ligero:', error);
  }
}

module.exports = {
  renderDashboardLight,
};