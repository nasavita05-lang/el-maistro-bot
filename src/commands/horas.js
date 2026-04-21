const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { obtenerAcumulado } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('horas')
    .setDescription('Consultar horas acumuladas'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse dentro de un servidor.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!exigirRol(interaction, ROLES.EMPLEADO)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar horas acumuladas.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const acumulado = obtenerAcumulado(userId, guildId);

    const minutos = acumulado?.total_minutos || 0;
    const jornadas = acumulado?.total_jornadas || 0;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('⏱️ Resumen de horas acumuladas')
      .setDescription('Consulta personal de actividad laboral registrada en el sistema.')
      .addFields(
        { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
        { name: '⏱️ Tiempo acumulado', value: formatearMinutos(minutos), inline: true },
        { name: '📁 Jornadas cerradas', value: String(jornadas), inline: true }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};