const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerAcumulado } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('horas')
    .setDescription('Consultar horas acumuladas')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Empleado a consultar')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    const usuario = interaction.options.getUser('usuario') || interaction.user;
    const consultaAjena = usuario.id !== interaction.user.id;

    if (consultaAjena && !exigirRol(interaction, ROLES.INSPECTOR)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar las horas de otro usuario.',
        ephemeral: true,
      });
      return;
    }

    if (!consultaAjena && !exigirRol(interaction, ROLES.EMPLEADO)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar tu registro laboral.',
        ephemeral: true,
      });
      return;
    }

    const acumulado = obtenerAcumulado(usuario.id, interaction.guild.id);

    const minutos = acumulado?.total_minutos || 0;
    const jornadas = acumulado?.total_jornadas || 0;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📊 Consulta de Registro Laboral')
      .setDescription('Resultado de consulta dentro del sistema institucional.')
      .addFields(
        { name: '👤 Empleado', value: `<@${usuario.id}>`, inline: true },
        { name: '⏱️ Tiempo acumulado', value: formatearMinutos(minutos), inline: true },
        { name: '📁 Jornadas registradas', value: String(jornadas), inline: true }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};