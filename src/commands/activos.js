const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { obtenerJornadasActivas } = require('../database/db');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activos')
    .setDescription('Ver trabajadores con jornada activa'),

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
        content: '❌ No tienes permiso para consultar jornadas activas.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;
    const activos = obtenerJornadasActivas(guildId);

    if (!activos.length) {
      const warnEmbed = new EmbedBuilder()
        .setColor(COLORS.warning || 0xf1c40f)
        .setTitle('⚠️ Sin jornadas activas')
        .setDescription('Actualmente no hay trabajadores con jornada activa dentro del sistema.')
        .setFooter({ text: FOOTERS.official })
        .setTimestamp();

      await interaction.reply({
        embeds: [warnEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const descripcion = activos.map((j, i) => {
      const unix = Math.floor(j.entrada_ts / 1000);

      return [
        `🟢 **ACTIVO ${i + 1}**`,
        `👤 Trabajador: <@${j.user_id}>`,
        `🧷 Usuario: ${j.username}`,
        `🕓 Entrada registrada: <t:${unix}:F>`,
        `⏳ En servicio desde: <t:${unix}:R>`,
      ].join('\n');
    }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🟢 Personal en Servicio Activo')
      .setDescription(descripcion)
      .addFields(
        {
          name: '📊 Total activos',
          value: String(activos.length),
          inline: true,
        },
        {
          name: '🏛️ Estado del sistema',
          value: 'Monitoreo en tiempo real',
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