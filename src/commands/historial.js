const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { obtenerHistorial } = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historial')
    .setDescription('Consultar historial de jornadas')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario a consultar')
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

    const usuarioObjetivo = interaction.options.getUser('usuario') || interaction.user;

    const puedeVerOtros =
      usuarioObjetivo.id === interaction.user.id || exigirRol(interaction, ROLES.INSPECTOR);

    if (!puedeVerOtros) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar el historial de otros trabajadores.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;
    const historial = obtenerHistorial(usuarioObjetivo.id, guildId, 10);

    if (!historial.length) {
      const warnEmbed = new EmbedBuilder()
        .setColor(COLORS.warning || 0xf1c40f)
        .setTitle('⚠️ Sin historial disponible')
        .setDescription(`No existen jornadas registradas para <@${usuarioObjetivo.id}>.`)
        .setFooter({ text: FOOTERS.official })
        .setTimestamp();

      await interaction.reply({
        embeds: [warnEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const descripcion = historial.map((j, i) => {
      const entrada = j.entrada_ts ? `<t:${Math.floor(j.entrada_ts / 1000)}:F>` : 'No registrada';
      const salida = j.salida_ts ? `<t:${Math.floor(j.salida_ts / 1000)}:F>` : 'Jornada activa';
      const tiempo = j.minutos_trabajados
        ? formatearMinutos(j.minutos_trabajados)
        : 'En curso';

      return [
        `📁 **REGISTRO ${i + 1}**`,
        `📅 Fecha: ${j.fecha || 'No definida'}`,
        `🟢 Entrada: ${entrada}`,
        `🔴 Salida: ${salida}`,
        `⏱️ Tiempo trabajado: ${tiempo}`,
        `📌 Estado: ${String(j.estado || 'desconocido').toUpperCase()}`,
      ].join('\n');
    }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📘 Historial de Jornadas')
      .setDescription(descripcion)
      .addFields(
        {
          name: '👤 Trabajador consultado',
          value: `<@${usuarioObjetivo.id}>`,
          inline: true,
        },
        {
          name: '📊 Registros mostrados',
          value: String(historial.length),
          inline: true,
        }
      )
      .setFooter({ text: FOOTERS.admin || FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};