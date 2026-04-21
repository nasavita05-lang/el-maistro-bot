const { SlashCommandBuilder, PermissionFlagsBits,MessageFlags } = require('discord.js');
const { asegurarPanelFijo } = require('../utils/panel');

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

    try {
      await asegurarPanelFijo(interaction.guild);

      await interaction.reply({
        content: '✅ Panel institucional verificado o restaurado correctamente.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('❌ Error al asegurar el panel:', error);

      await interaction.reply({
        content: '❌ No se pudo verificar o restaurar el panel institucional.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};