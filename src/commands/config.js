const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
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
    )

    .addSubcommand(sub =>
      sub
        .setName('sistema')
        .setDescription('Activar o desactivar el sistema')
        .addStringOption(option =>
          option
            .setName('estado')
            .setDescription('Estado operativo del sistema')
            .setRequired(true)
            .addChoices(
              { name: 'Activar', value: 'activar' },
              { name: 'Desactivar', value: 'desactivar' }
            )
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

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const guild = interaction.guild;
    const guildId = guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') {
      const config = obtenerConfiguracionEfectiva(guildId);
      const roles = obtenerConfiguracionRoles(guildId) || {};

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('⚙️ Configuración institucional del sistema')
        .setDescription('Resumen general de la configuración operativa del servidor.')
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
            name: '🟢 Estado del sistema',
            value: config.system_enabled ? 'Activo' : 'Deshabilitado',
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

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    if (sub === 'timezone') {
      const zona = interaction.options.getString('zona', true).trim();

      if (!esTimezoneValida(zona)) {
        const warnEmbed = new EmbedBuilder()
          .setColor(COLORS.warning || 0xf1c40f)
          .setTitle('❌ Timezone inválida')
          .setDescription(
            [
              'La zona horaria indicada no es válida.',
              '',
              'Usa formato IANA, por ejemplo:',
              '`America/Mexico_City`',
            ].join('\n')
          )
          .setFooter({ text: FOOTERS.admin || FOOTERS.official })
          .setTimestamp();

        await interaction.editReply({
          embeds: [warnEmbed],
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
        .setDescription(
          [
            'La zona horaria del servidor fue actualizada correctamente.',
            '',
            `Nueva zona configurada: \`${zona}\``,
          ].join('\n')
        )
        .setFooter({ text: FOOTERS.admin || FOOTERS.official })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    if (sub === 'sistema') {
      const estado = interaction.options.getString('estado', true);
      const habilitado = estado === 'activar';

      guardarConfiguracionCanales(guildId, {
        guild_name: guild.name,
        system_enabled: habilitado ? 1 : 0,
      });

      const embed = new EmbedBuilder()
        .setColor(habilitado ? COLORS.success : (COLORS.warning || 0xf1c40f))
        .setTitle(habilitado ? '✅ Sistema activado' : '⚠️ Sistema desactivado')
        .setDescription(
          habilitado
            ? 'El sistema institucional quedó habilitado y operativo para este servidor.'
            : 'El sistema institucional fue deshabilitado para este servidor.'
        )
        .addFields(
          {
            name: '🏛️ Servidor',
            value: guild.name,
            inline: true,
          },
          {
            name: '📌 Estado actual',
            value: habilitado ? 'Activo' : 'Deshabilitado',
            inline: true,
          }
        )
        .setFooter({ text: FOOTERS.admin || FOOTERS.official })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    }
  },
};