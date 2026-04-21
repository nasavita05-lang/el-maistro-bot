const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const {
  cerrarSalida,
  obtenerConfiguracionEfectiva,
} = require('../database/db');
const { renderDashboardLight } = require('../utils/dashboard');
const { formatearMinutos } = require('../utils/format');
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

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const username = interaction.user.tag;

    const resultado = cerrarSalida(userId, guildId);
    if (!resultado) {
      const warnEmbed = new EmbedBuilder()
        .setColor(COLORS.warning || 0xf1c40f)
        .setTitle('⚠️ Sin jornada activa')
        .setDescription('No cuentas con una jornada abierta para poder registrar salida.')
        .addFields(
          { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
          { name: '📌 Estado', value: 'Sin jornada activa', inline: true }
        )
        .setFooter({ text: FOOTERS.official })
        .setTimestamp();

      await interaction.editReply({
        embeds: [warnEmbed],
      });
      return;
    }

    const tiempo = formatearMinutos(resultado.minutos_trabajados);

    const okEmbed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('🔴 Salida registrada')
      .setDescription('La jornada laboral fue cerrada correctamente en el sistema.')
      .addFields(
        { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
        { name: '🧷 Usuario', value: username, inline: true },
        { name: '⏱️ Tiempo trabajado', value: tiempo, inline: true },
        { name: '🕓 Registro', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await interaction.editReply({
      embeds: [okEmbed],
    });

    const config = obtenerConfiguracionEfectiva(guildId);
    const logChannelId = config?.log_channel_id || null;
    if (logChannelId) {
      const canal = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
      if (canal && canal.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setColor(COLORS.danger)
          .setTitle('📘 REGISTRO DE BITÁCORA')
          .setDescription([
            '━━━━━━━━━━━━━━━━━━━━━━',
            '🔴 **MOVIMIENTO REGISTRADO: SALIDA DE SERVICIO**',
            '━━━━━━━━━━━━━━━━━━━━━━',
          ].join('\n'))
          .addFields(
            { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
            { name: '🧷 Usuario Discord', value: username, inline: true },
            { name: '📌 Estado actual', value: 'CERRADO', inline: true },
            { name: '⏱️ Tiempo laborado', value: tiempo, inline: true },
            { name: '🕓 Fecha de registro', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
            {
              name: '📄 Observación',
              value: 'La jornada laboral fue cerrada correctamente y quedó asentada en la bitácora institucional.',
            }
          )
          .setFooter({ text: FOOTERS.official })
          .setTimestamp();

        await canal.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    await renderDashboardLight(interaction.client, guildId).catch(() => {});
  },
};