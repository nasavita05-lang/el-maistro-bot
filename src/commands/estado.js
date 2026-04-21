const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const {
  obtenerConfiguracionEfectiva,
  obtenerJornadasActivas,
  obtenerTodasLasJornadas,
  topTrabajadores,
} = require('../database/db');
const { formatearMinutos } = require('../utils/format');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('estado')
    .setDescription('Ver resumen institucional del sistema'),

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
        content: '❌ No tienes permiso para consultar el estado institucional del sistema.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;
    const guildId = guild.id;

    const config = obtenerConfiguracionEfectiva(guildId);
    const activas = obtenerJornadasActivas(guildId);
    const jornadas = obtenerTodasLasJornadas(guildId);
    const top = topTrabajadores(guildId, 1);

    const totalJornadas = jornadas.length;
    const jornadasCerradas = jornadas.filter(j => j.estado === 'cerrado').length;
    const jornadasActivas = activas.length;
    const totalMinutos = jornadas.reduce((acc, j) => acc + (j.minutos_trabajados || 0), 0);

    const lider = top[0]
      ? `<@${top[0].user_id}> — ${formatearMinutos(top[0].total_minutos)}`
      : 'Sin registros';

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📊 Estado Institucional del Sistema')
      .setDescription(
        [
          'Resumen operativo del sistema de bitácora laboral.',
          '',
          'Este reporte consolida configuración, actividad laboral y desempeño general del servidor.',
        ].join('\n')
      )
      .addFields(
        {
          name: '🏛️ Servidor',
          value: guild.name,
          inline: true,
        },
        {
          name: '🌍 Timezone',
          value: config.timezone || 'No configurada',
          inline: true,
        },
        {
          name: '🟢 Sistema',
          value: config.system_enabled ? 'Activo' : 'Deshabilitado',
          inline: true,
        },
        {
          name: '🟢 Jornadas activas',
          value: String(jornadasActivas),
          inline: true,
        },
        {
          name: '✅ Jornadas cerradas',
          value: String(jornadasCerradas),
          inline: true,
        },
        {
          name: '📁 Jornadas totales',
          value: String(totalJornadas),
          inline: true,
        },
        {
          name: '⏱️ Tiempo acumulado general',
          value: formatearMinutos(totalMinutos),
          inline: true,
        },
        {
          name: '🥇 Líder actual',
          value: lider,
          inline: true,
        },
        {
          name: '🪟 Canal de panel',
          value: config.panel_channel_id ? `<#${config.panel_channel_id}>` : 'No configurado',
          inline: true,
        },
        {
          name: '🧾 Canal de logs',
          value: config.log_channel_id ? `<#${config.log_channel_id}>` : 'No configurado',
          inline: true,
        },
        {
          name: '🏆 Canal de ranking',
          value: config.ranking_channel_id ? `<#${config.ranking_channel_id}>` : 'No configurado',
          inline: true,
        }
      )
      .setFooter({ text: FOOTERS.system || FOOTERS.official })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};