const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { topTrabajadores } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Consultar clasificación laboral'),

  async execute(interaction) {
    const top = topTrabajadores(interaction.guild.id, 10);

    if (!top.length) {
      return interaction.reply({
        content: 'No existen registros acumulados en el sistema.',
        ephemeral: true,
      });
    }

    const descripcion = top.map((u, i) => {
      const icono =
        i === 0 ? '🥇' :
        i === 1 ? '🥈' :
        i === 2 ? '🥉' : '🏅';

      return [
        `${icono} **PUESTO ${i + 1}**`,
        `👤 Trabajador: <@${u.user_id}>`,
        `⏱️ Tiempo acumulado: **${formatearMinutos(u.total_minutos)}**`,
        `📁 Jornadas cerradas: **${u.total_jornadas}**`
      ].join('\n');
    }).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🏆 Leaderboard Laboral')
      .setDescription(descripcion)
      .setFooter({ text: FOOTERS.ranking })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};