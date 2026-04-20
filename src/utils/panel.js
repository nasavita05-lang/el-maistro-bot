const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const {
  obtenerPanelMessageId,
  guardarPanelMessageId,
  obtenerConfiguracionEfectiva,
} = require('../database/db');

const { botName } = require('../config');
const { COLORS, FOOTERS } = require('./theme');

function crearPanelPayload() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🏛️ ${botName} | Panel Institucional de Bitácora`)
    .setDescription(
      [
        '━━━━━━━━━━━━━━━━━━━━',
        '📘 **REGISTRO OFICIAL DE BITÁCORA LABORAL**',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        'Seleccione una acción desde el panel:',
        '',
        '🟢 **Entrar** → Apertura de jornada',
        '🔴 **Salir** → Cierre de jornada',
        '⏱️ **Horas** → Consulta de horas acumuladas',
        '🏆 **Ranking** → Consulta de clasificación laboral',
      ].join('\n')
    )
    .addFields(
      { name: '📂 Tipo de sistema', value: 'Bitácora laboral automatizada', inline: true },
      { name: '🛡️ Estado', value: 'Operativo', inline: true },
      { name: '📌 Modo', value: 'Panel único institucional', inline: true }
    )
    .setFooter({ text: FOOTERS.official })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel_entrar')
      .setLabel('Entrar')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('panel_salir')
      .setLabel('Salir')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('panel_horas')
      .setLabel('Horas')
      .setEmoji('⏱️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel_ranking')
      .setLabel('Ranking')
      .setEmoji('🏆')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

async function asegurarPanelFijo(guild) {
  if (!guild) return null;

  const config = obtenerConfiguracionEfectiva(guild.id);
  if (!config.system_enabled) return null;

  const panelChannelId = config.panel_channel_id;
  if (!panelChannelId) return null;

  const canal = await guild.channels.fetch(panelChannelId).catch(() => null);
  if (!canal || !canal.isTextBased()) return null;

  const panelMessageId = obtenerPanelMessageId(guild.id);
  const payload = crearPanelPayload();

  if (panelMessageId) {
    try {
      const mensaje = await canal.messages.fetch(panelMessageId);
      await mensaje.edit(payload);
      return mensaje;
    } catch (_) {}
  }

  const nuevoMensaje = await canal.send(payload);
  guardarPanelMessageId(guild.id, nuevoMensaje.id);
  return nuevoMensaje;
}

module.exports = {
  asegurarPanelFijo,
  crearPanelPayload,
};