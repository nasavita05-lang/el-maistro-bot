const { SlashCommandBuilder, EmbedBuilder,MessageFlags } = require('discord.js');
const {
  cerrarSalida,
  obtenerConfiguracion,
} = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { timezone, logChannelId: defaultLogChannelId } = require('../config');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('salir')
    .setDescription('Registrar salida de servicio'),

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
        content: '❌ No tienes permiso para registrar salida de servicio.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const username = interaction.user.tag;

    const resultado = cerrarSalida(userId, guildId);

    if (!resultado) {
      await interaction.reply({
        content: '⚠️ No cuentas con una jornada activa.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const tiempo = formatearMinutos(resultado.minutos_trabajados);

    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('🔴 Registro de Salida')
      .setDescription('Se ha finalizado correctamente la jornada laboral.')
      .addFields(
        { name: '👤 Empleado', value: `<@${userId}>`, inline: true },
        { name: '⏱️ Tiempo trabajado', value: tiempo, inline: true },
        { name: '📅 Fecha de salida', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    const config = obtenerConfiguracion(guildId);
    const logChannelId = config?.log_channel_id || defaultLogChannelId || '';

    if (!logChannelId) return;

    const canal = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
    if (!canal || !canal.isTextBased()) return;

    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('📘 REGISTRO DE BITÁCORA')
      .setDescription(
        [
          '━━━━━━━━━━━━━━━━━━━━',
          '🔴 **MOVIMIENTO REGISTRADO: SALIDA DE SERVICIO**',
          '━━━━━━━━━━━━━━━━━━━━',
        ].join('\n')
      )
      .addFields(
        { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
        { name: '🧷 Usuario Discord', value: username, inline: true },
        { name: '📌 Estado actual', value: 'CERRADO', inline: true },
        { name: '⏱️ Tiempo laborado', value: tiempo, inline: true },
        {
          name: '🕓 Fecha de registro',
          value: new Intl.DateTimeFormat('es-MX', {
            timeZone: timezone,
            dateStyle: 'full',
            timeStyle: 'short',
          }).format(new Date()),
          inline: true,
        },
        {
          name: '📄 Observación del sistema',
          value: 'La jornada laboral fue cerrada correctamente y los datos quedaron asentados en la bitácora oficial.',
        }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await canal.send({ embeds: [logEmbed] }).catch(() => {});
  },
};