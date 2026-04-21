const { SlashCommandBuilder, EmbedBuilder,MessageFlags } = require('discord.js');
const {
  obtenerJornadaActiva,
  crearEntrada,
  obtenerConfiguracion,
} = require('../database/db');
const { timezone, logChannelId: defaultLogChannelId } = require('../config');
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

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const username = interaction.user.tag;

    const activa = obtenerJornadaActiva(userId, guildId);
    if (activa) {
      await interaction.reply({
        content: '⚠️ Ya cuentas con una jornada activa.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    crearEntrada(userId, username, guildId);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🟢 Registro de Entrada')
      .setDescription('Se ha registrado correctamente el inicio de jornada laboral.')
      .addFields(
        { name: '👤 Empleado', value: `<@${userId}>`, inline: true },
        { name: '📌 Usuario', value: username, inline: true },
        { name: '📅 Fecha y hora', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
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
      .setColor(COLORS.success)
      .setTitle('📘 REGISTRO DE BITÁCORA')
      .setDescription(
        [
          '━━━━━━━━━━━━━━━━━━━━',
          '🟢 **MOVIMIENTO REGISTRADO: ENTRADA A SERVICIO**',
          '━━━━━━━━━━━━━━━━━━━━',
        ].join('\n')
      )
      .addFields(
        { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
        { name: '🧷 Usuario Discord', value: username, inline: true },
        { name: '📌 Estado actual', value: 'ACTIVO', inline: true },
        {
          name: '🕓 Fecha de registro',
          value: new Intl.DateTimeFormat('es-MX', {
            timeZone: timezone,
            dateStyle: 'full',
            timeStyle: 'short',
          }).format(new Date()),
        },
        {
          name: '📄 Observación del sistema',
          value: 'Se abrió correctamente una nueva jornada laboral dentro del sistema oficial de bitácora.',
        }
      )
      .setFooter({ text: FOOTERS.official })
      .setTimestamp();

    await canal.send({ embeds: [logEmbed] }).catch(() => {});
  },
}; 