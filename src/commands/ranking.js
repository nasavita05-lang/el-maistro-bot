const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { topTrabajadores } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Consultar ranking laboral'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse dentro de un servidor.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!exigirRol(interaction, ROLES.INSPECTOR)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar el ranking laboral.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;
    const top = topTrabajadores(guildId, 10);

    if (!top.length) {
      await interaction.reply({
        content: '⚠️ No existen registros acumulados en el sistema.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const descripcion = top.map((u, i) => {
      const icono =
        i === 0 ? '🥇' :
        i === 1 ? '🥈' :
        i === 2 ? '🥉' :
        '🏅';

      return [
        `${icono} **PUESTO ${i + 1}**`,
        `👤 Trabajador: <@${u.user_id}>`,
        `⏱️ Tiempo acumulado: **${formatearMinutos(u.total_minutos)}**`,
        `📁 Jornadas cerradas: **${u.total_jornadas}**`,
      ].join('\n');
    }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🏆 Ranking Laboral Institucional')
      .setDescription(descripcion)
      .setFooter({ text: FOOTERS.ranking || FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};