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
    .setTitle(`🏛️ ${botName} | Panel Central de Bitácora`)
    .setDescription(
      [
        '━━━━━━━━━━━━━━━━━━━━━━',
        '📘 **SISTEMA INSTITUCIONAL DE CONTROL LABORAL**',
        '━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Bienvenido al panel central del sistema.',
        'Desde este módulo puede registrar, consultar y supervisar movimientos de jornada laboral en tiempo real.',
        '',
        '### Acciones disponibles',
        '🟢 **Entrar** — Registrar inicio de jornada',
        '🔴 **Salir** — Registrar cierre de jornada',
        '⏱️ **Horas** — Consultar tiempo acumulado',
        '🏆 **Ranking** — Ver clasificación laboral',
        '',
        'Use los botones inferiores para interactuar con el sistema.',
      ].join('\n')
    )
    .addFields(
      {
        name: '📂 Módulo',
        value: 'Bitácora laboral automatizada',
        inline: true,
      },
      {
        name: '🛡️ Estado del sistema',
        value: 'Operativo',
        inline: true,
      },
      {
        name: '🏢 Tipo de panel',
        value: 'Institucional fijo',
        inline: true,
      },
      {
        name: '📌 Uso recomendado',
        value: 'Registrar y consultar actividad laboral desde este panel central.',
      }
    )
    .setFooter({
      text: FOOTERS?.official || `${botName} | Sistema institucional`,
    })
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