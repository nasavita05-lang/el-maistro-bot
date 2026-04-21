const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTERS } = require('./theme');

function formatearFechaActual(timezone = 'America/Mexico_City') {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date());
}

function crearLogEntrada({ userId, username, timezone }) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('📘 REGISTRO INSTITUCIONAL DE BITÁCORA')
    .setDescription([
      '━━━━━━━━━━━━━━━━━━━━━━',
      '🟢 **MOVIMIENTO REGISTRADO: ENTRADA A SERVICIO**',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Se registró correctamente el inicio de jornada dentro del sistema institucional.',
    ].join('\n'))
    .addFields(
      { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
      { name: '🧷 Usuario Discord', value: username, inline: true },
      { name: '📌 Estado actual', value: 'ACTIVO', inline: true },
      { name: '🕓 Fecha de registro', value: formatearFechaActual(timezone) },
      {
        name: '📄 Observación',
        value: 'El trabajador inició correctamente su jornada laboral y quedó asentado en la bitácora oficial.',
      }
    )
    .setFooter({ text: FOOTERS.official })
    .setTimestamp();
}

function crearLogSalida({ userId, username, tiempo, timezone }) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('📘 REGISTRO INSTITUCIONAL DE BITÁCORA')
    .setDescription([
      '━━━━━━━━━━━━━━━━━━━━━━',
      '🔴 **MOVIMIENTO REGISTRADO: SALIDA DE SERVICIO**',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Se registró correctamente el cierre de jornada dentro del sistema institucional.',
    ].join('\n'))
    .addFields(
      { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
      { name: '🧷 Usuario Discord', value: username, inline: true },
      { name: '📌 Estado actual', value: 'CERRADO', inline: true },
      { name: '⏱️ Tiempo laborado', value: tiempo, inline: true },
      { name: '🕓 Fecha de registro', value: formatearFechaActual(timezone), inline: true },
      {
        name: '📄 Observación',
        value: 'La jornada laboral fue cerrada correctamente y los datos quedaron asentados en la bitácora oficial.',
      }
    )
    .setFooter({ text: FOOTERS.official })
    .setTimestamp();
}

function crearLogSistema({ titulo, descripcion, color, campos = [] }) {
  const embed = new EmbedBuilder()
    .setColor(color || COLORS.primary)
    .setTitle(`🛠️ ${titulo}`)
    .setDescription(descripcion)
    .setFooter({ text: FOOTERS.system || FOOTERS.official })
    .setTimestamp();

  if (campos.length) {
    embed.addFields(campos);
  }

  return embed;
}

module.exports = {
  crearLogEntrada,
  crearLogSalida,
  crearLogSistema,
};