const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

const {
  guardarConfiguracionCanales,
  guardarConfiguracionRoles,
  obtenerConfiguracionEfectiva,
  obtenerConfiguracionRoles,
} = require('../database/db');

const { asegurarPanelFijo } = require('../utils/panel');
const { exigirRol, ROLES } = require('../utils/permissions');
const { COLORS, FOOTERS } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configuración inicial del sistema multiservidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sub =>
      sub
        .setName('canales')
        .setDescription('Configurar canales del sistema')
        .addChannelOption(option =>
          option
            .setName('panel')
            .setDescription('Canal donde se publicará el panel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('logs')
            .setDescription('Canal donde se enviarán los logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('ranking')
            .setDescription('Canal destinado al ranking / dashboard')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('roles')
        .setDescription('Configurar roles del sistema')
        .addRoleOption(option =>
          option
            .setName('admin')
            .setDescription('Rol administrador del sistema')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option
            .setName('supervisor')
            .setDescription('Rol supervisor')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option
            .setName('inspector')
            .setDescription('Rol inspector')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option
            .setName('empleado')
            .setDescription('Rol empleado')
            .setRequired(false)
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
        content: '❌ No tienes permiso para configurar este sistema.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    if (sub === 'canales') {
      const panel = interaction.options.getChannel('panel');
      const logs = interaction.options.getChannel('logs');
      const ranking = interaction.options.getChannel('ranking');

      if (!panel && !logs && !ranking) {
        await interaction.reply({
          content: '⚠️ Debes indicar al menos un canal para actualizar.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      guardarConfiguracionCanales(guildId, {
        guild_name: guild.name,
        panel_channel_id: panel?.id,
        log_channel_id: logs?.id,
        ranking_channel_id: ranking?.id,
      });

      if (panel) {
        await asegurarPanelFijo(guild).catch(() => {});
      }

      const config = obtenerConfiguracionEfectiva(guildId);

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Canales configurados')
        .setDescription('La configuración de canales se actualizó correctamente.')
        .addFields(
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
        .setFooter({ text: FOOTERS.admin || FOOTERS.official })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'roles') {
      const admin = interaction.options.getRole('admin');
      const supervisor = interaction.options.getRole('supervisor');
      const inspector = interaction.options.getRole('inspector');
      const empleado = interaction.options.getRole('empleado');

      if (!admin && !supervisor && !inspector && !empleado) {
        await interaction.reply({
          content: '⚠️ Debes indicar al menos un rol para actualizar.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      guardarConfiguracionRoles({
        guildId,
        administradorRoleId: admin?.id,
        supervisorRoleId: supervisor?.id,
        inspectorRoleId: inspector?.id,
        empleadoRoleId: empleado?.id,
      });

      const roles = obtenerConfiguracionRoles(guildId) || {};

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Roles configurados')
        .setDescription('La configuración de roles se actualizó correctamente.')
        .addFields(
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
    }
  },
};