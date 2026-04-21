const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const {
  obtenerJornadaActiva,
  crearEntrada,
  obtenerConfiguracionEfectiva,
} = require('../database/db');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('entrar')
    .setDescription('Registrar entrada a servicio'),

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
        content: '❌ No tienes permiso para registrar entrada a servicio.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const username = interaction.user.tag;

    const activa = obtenerJornadaActiva(userId, guildId);
    if (activa) {
      const warnEmbed = new EmbedBuilder()
        .setColor(COLORS.warning || 0xf1c40f)
        .setTitle('⚠️ Jornada ya activa')
        .setDescription('Ya cuentas con una jornada laboral abierta dentro del sistema.')
        .addFields(
          { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
          { name: '📌 Estado', value: 'Activo', inline: true }
        )
        .setFooter({ text: FOOTERS.official })
        .setTimestamp();

      await interaction.editReply({
        embeds: [warnEmbed],
      });
      return;
    }

    crearEntrada(userId, username, guildId);

    const okEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🟢 Entrada registrada')
      .setDescription('El sistema registró correctamente el inicio de la jornada laboral.')
      .addFields(
        { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
        { name: '🧷 Usuario', value: username, inline: true },
        { name: '📌 Estado actual', value: 'ACTIVO', inline: true },
        { name: '🕓 Registro', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await interaction.editReply({
      embeds: [okEmbed],
    });

    const config = obtenerConfiguracionEfectiva(guildId);
    const logChannelId = config?.log_channel_id || null;
    if (!logChannelId) return;

    const canal = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
    if (!canal || !canal.isTextBased()) return;

    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('📘 REGISTRO DE BITÁCORA')
      .setDescription([
        '━━━━━━━━━━━━━━━━━━━━━━',
        '🟢 **MOVIMIENTO REGISTRADO: ENTRADA A SERVICIO**',
        '━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'))
      .addFields(
        { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
        { name: '🧷 Usuario Discord', value: username, inline: true },
        { name: '📌 Estado actual', value: 'ACTIVO', inline: true },
        { name: '🕓 Fecha de registro', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
        {
          name: '📄 Observación',
          value: 'Se abrió correctamente una nueva jornada laboral dentro del sistema institucional.',
        }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await canal.send({ embeds: [logEmbed] }).catch(() => {});
  },
};