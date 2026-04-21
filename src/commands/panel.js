const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');
const { asegurarPanelFijo } = require('../utils/panel');
const { COLORS, FOOTERS } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Verificar o restaurar el panel institucional')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse dentro de un servidor.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ No tienes permisos suficientes para administrar el panel institucional.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      await asegurarPanelFijo(interaction.guild);

      const embed = new EmbedBuilder()
        .setColor(COLORS.info || 0x1f4e78)
        .setTitle('🛠️ Panel Institucional Verificado')
        .setDescription(
          [
            'El sistema revisó correctamente el panel institucional del servidor.',
            '',
            'Si el panel no existía o presentaba inconsistencias, fue restaurado automáticamente.',
          ].join('\n')
        )
        .addFields(
          {
            name: '🏛️ Servidor',
            value: interaction.guild.name,
            inline: true,
          },
          {
            name: '📌 Acción ejecutada',
            value: 'Verificación / restauración del panel',
            inline: true,
          },
          {
            name: '✅ Estado',
            value: 'Operativo',
            inline: true,
          }
        )
        .setFooter({
          text: FOOTERS?.official || 'EL MAISTRO | Panel institucional',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.error('❌ Error al asegurar el panel:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.danger || 0x8b0000)
        .setTitle('❌ Error al restaurar el panel')
        .setDescription(
          [
            'No se pudo verificar o restaurar el panel institucional.',
            '',
            'Revisa la configuración del servidor, permisos del bot y los logs del sistema.',
          ].join('\n')
        )
        .addFields(
          {
            name: '🏛️ Servidor',
            value: interaction.guild?.name || 'Desconocido',
            inline: true,
          },
          {
            name: '📌 Estado',
            value: 'Fallido',
            inline: true,
          }
        )
        .setFooter({
          text: FOOTERS?.official || 'EL MAISTRO | Panel institucional',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [errorEmbed],
      }).catch(() => {});
    }
  },
};