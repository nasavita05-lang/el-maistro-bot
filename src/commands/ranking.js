const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { topTrabajadores } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Consultar ranking laboral institucional'),

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
      const warnEmbed = new EmbedBuilder()
        .setColor(COLORS.warning || 0xf1c40f)
        .setTitle('⚠️ Ranking no disponible')
        .setDescription('No existen registros acumulados en el sistema para generar la clasificación laboral.')
        .setFooter({ text: FOOTERS.ranking || FOOTERS.official })
        .setTimestamp();

      await interaction.reply({
        embeds: [warnEmbed],
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

    const lider = top[0];

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold || COLORS.primary)
      .setTitle('🏆 Ranking Laboral Institucional')
      .setDescription(descripcion)
      .addFields(
        {
          name: '🥇 Líder actual',
          value: `<@${lider.user_id}>`,
          inline: true,
        },
        {
          name: '⏱️ Mejor acumulado',
          value: formatearMinutos(lider.total_minutos),
          inline: true,
        },
        {
          name: '📊 Registros evaluados',
          value: String(top.length),
          inline: true,
        }
      )
      .setFooter({ text: FOOTERS.ranking || FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};