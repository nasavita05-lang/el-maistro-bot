const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

const {
  obtenerConfiguracionEfectiva,
  obtenerConfiguracionRoles,
  guardarConfiguracionCanales,
} = require('../database/db');

const { exigirRol, ROLES } = require('../utils/permissions');
const { COLORS, FOOTERS } = require('../utils/theme');

function esTimezoneValida(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Consultar o ajustar configuración del sistema')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Ver configuración actual del servidor')
    )

    .addSubcommand(sub =>
      sub
        .setName('timezone')
        .setDescription('Actualizar zona horaria del servidor')
        .addStringOption(option =>
          option
            .setName('zona')
            .setDescription('Zona horaria IANA. Ej: America/Mexico_City')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse dentro de un servidor.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!exigirRol(interaction, ROLES.ADMIN)) {
      await interaction.reply({
        content: '❌ No tienes permiso para consultar o modificar la configuración.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;
    const guildId = guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') {
      const config = obtenerConfiguracionEfectiva(guildId);
      const roles = obtenerConfiguracionRoles(guildId) || {};

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('⚙️ Configuración del sistema')
        .setDescription('Estado actual de la configuración multiservidor.')
        .addFields(
          {
            name: '🏷️ Servidor',
            value: config.guild_name || guild.name,
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
            name: '🪟 Panel',
            value: config.panel_channel_id ? `<#${config.panel_channel_id}>` : 'No configurado',
            inline: true,
          },
          {
            name: '🧾 Logs',
            value: config.log_channel_id ? `<#${config.log_channel_id}>` : 'No configurado',
            inline: true,
          },
          {
            name: '🏆 Ranking',
            value: config.ranking_channel_id ? `<#${config.ranking_channel_id}>` : 'No configurado',
            inline: true,
          },
          {
            name: '🛡️ Admin',
            value: roles.administrador_role_id ? `<@&${roles.administrador_role_id}>` : 'No configurado',
            inline: true,
          },
          {
            name: '🧭 Supervisor',
            value: roles.supervisor_role_id ? `<@&${roles.supervisor_role_id}>` : 'No configurado',
            inline: true,
          },
          {
            name: '🔎 Inspector',
            value: roles.inspector_role_id ? `<@&${roles.inspector_role_id}>` : 'No configurado',
            inline: true,
          },
          {
            name: '👷 Empleado',
            value: roles.empleado_role_id ? `<@&${roles.empleado_role_id}>` : 'No configurado',
            inline: true,
          }
        )
        .setFooter({ text: FOOTERS.admin || FOOTERS.official })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'timezone') {
      const zona = interaction.options.getString('zona', true).trim();

      if (!esTimezoneValida(zona)) {
        await interaction.reply({
          content: '❌ La timezone no es válida. Usa formato IANA, por ejemplo: `America/Mexico_City`',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      guardarConfiguracionCanales(guildId, {
        guild_name: guild.name,
        timezone: zona,
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Timezone actualizada')
        .setDescription(`La zona horaria del servidor ahora es:\n\`${zona}\``)
        .setFooter({ text: FOOTERS.admin || FOOTERS.official })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};