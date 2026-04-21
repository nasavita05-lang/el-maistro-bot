const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn('Comando no encontrado en colección', {
          commandName: interaction.commandName,
          guildId: interaction.guildId,
          userId: interaction.user?.id,
        });

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '⚠️ Ese comando no está disponible en este momento.',
            ephemeral: true,
          });
        }

        return;
      }

      logger.cmd('Slash command recibido', {
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        userId: interaction.user?.id,
        username: interaction.user?.tag,
      });

      await command.execute(interaction);
    } catch (error) {
      logger.error('Error en interactionCreate', {
        message: error?.message,
        guildId: interaction.guildId,
        userId: interaction.user?.id,
        commandName: interaction.commandName,
      });

      const payload = {
        content: '❌ Ocurrió un error al ejecutar este comando.',
        ephemeral: true,
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (replyError) {
        logger.error('No se pudo responder al error de interacción', {
          message: replyError?.message,
        });
      }
    }
  },
};
