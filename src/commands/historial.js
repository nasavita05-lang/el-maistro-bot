const { SlashCommandBuilder, EmbedBuilder , MessageFlags} = require('discord.js');
const { obtenerHistorial } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historial')
    .setDescription('Consultar historial laboral')
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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const usuario = interaction.options.getUser('usuario') || interaction.user;
    const consultaAjena = usuario.id !== interaction.user.id;

    if (consultaAjena && !exigirRol(interaction, ROLES.INSPECTOR)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar el historial de otro usuario.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!consultaAjena && !exigirRol(interaction, ROLES.EMPLEADO)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar tu historial laboral.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const historial = obtenerHistorial(usuario.id, interaction.guild.id, 10);

    if (!historial.length) {
      await interaction.reply({
        content: '⚠️ No existen registros en el sistema.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const descripcion = historial.map((j, i) => {
      const estado = j.estado === 'activo' ? '🟡 ACTIVO' : '🔴 CERRADO';
      const tiempo = j.minutos_trabajados
        ? formatearMinutos(j.minutos_trabajados)
        : 'En curso';

      return [
        `📁 **Registro ${i + 1}**`,
        `📅 Fecha: ${j.fecha}`,
        `📌 Estado: ${estado}`,
        `⏱️ Tiempo: ${tiempo}`,
      ].join('\n');
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.neutral)
      .setTitle('📂 Historial Laboral')
      .setDescription('Consulta oficial del registro de jornadas laborales.')
      .addFields(
        { name: '👤 Empleado', value: `<@${usuario.id}>` },
        { name: '📄 Registros recientes', value: descripcion }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};