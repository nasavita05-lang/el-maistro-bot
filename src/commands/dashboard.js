const { SlashCommandBuilder } = require('discord.js');
const { buildStatusEmbed } = require('../utils/statusCard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Muestra el dashboard general del bot.'),

  async execute(interaction) {
    const embed = buildStatusEmbed(interaction.client, interaction)
      .setTitle('📈 Dashboard de EL MAISTRO')
      .setDescription('Vista rápida del estado operativo del bot.');

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  },
};
