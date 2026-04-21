const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const {
  obtenerJornadaActiva,
  crearEntrada,
  cerrarSalida,
  obtenerAcumulado,
  topTrabajadores,
  obtenerConfiguracionEfectiva,
  getUltimaRevision,
} = require('../database/db');

const { renderDashboardLight } = require('../utils/dashboard');
const { formatearMinutos } = require('../utils/format');
const { timezone } = require('../config');
const { COLORS, FOOTERS } = require('../utils/theme');
const { exigirRol, ROLES } = require('../utils/permissions');
const { crearLogEntrada, crearLogSalida } = require('../utils/logs');

const cooldowns = new Map();

const cooldownCleaner = setInterval(() => {
  const now = Date.now();

  for (const [key, time] of cooldowns.entries()) {
    if (now - time > 10000) {
      cooldowns.delete(key);
    }
  }
}, 10000);

if (typeof cooldownCleaner.unref === 'function') {
  cooldownCleaner.unref();
}

function tieneCooldown(userId, customId, ms = 3000) {
  const key = `${userId}_${customId}`;
  const now = Date.now();

  if (cooldowns.has(key) && now - cooldowns.get(key) < ms) {
    return true;
  }

  cooldowns.set(key, now);
  return false;
}

function diasSinRevision(lastReviewTs) {
  if (!lastReviewTs) return null;
  return (Date.now() - lastReviewTs) / (1000 * 60 * 60 * 24);
}

function crearEmbedRespuesta({ color, titulo, descripcion, campos = [] }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(descripcion)
    .setFooter({ text: FOOTERS.official })
    .setTimestamp();

  if (campos.length) {
    embed.addFields(campos);
  }

  return embed;
}

async function enviarLogBitacora(guild, channelId, embed) {
  if (!channelId) return;

  const canal = await guild.channels.fetch(channelId).catch(() => null);
  if (!canal || !canal.isTextBased()) return;

  await canal.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      if (!interaction || typeof interaction.isChatInputCommand !== 'function') {
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction);
        return;
      }

      if (!interaction.isButton()) return;
      if (!interaction.guild) return;

      const guild = interaction.guild;
      const guildId = guild.id;
      const userId = interaction.user.id;
      const username = interaction.user.tag;
      const customId = interaction.customId;

      const botonesPanel = [
        'panel_entrar',
        'panel_salir',
        'panel_horas',
        'panel_ranking',
      ];

      if (!botonesPanel.includes(customId)) return;
      if (interaction.deferred || interaction.replied) return;

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      if (tieneCooldown(userId, customId)) {
        const embed = crearEmbedRespuesta({
          color: COLORS.warning || 0xf1c40f,
          titulo: '⏳ Acción en espera',
          descripcion: 'Espera unos segundos antes de volver a usar este botón.',
        });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const config = obtenerConfiguracionEfectiva(guildId);

      if (!config.system_enabled) {
        const embed = crearEmbedRespuesta({
          color: COLORS.warning || 0xf1c40f,
          titulo: '⚠️ Sistema deshabilitado',
          descripcion: 'El sistema institucional está deshabilitado en este servidor.',
        });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const logChannelId = config.log_channel_id || '';
      const activeTimezone = config.timezone || timezone;

      const requiereRolEmpleado = ['panel_entrar', 'panel_salir', 'panel_horas'];

      if (requiereRolEmpleado.includes(customId) && !exigirRol(interaction, ROLES.EMPLEADO)) {
        const embed = crearEmbedRespuesta({
          color: COLORS.danger || 0x8b0000,
          titulo: '❌ Acceso denegado',
          descripcion: 'No tienes permiso para usar este panel laboral.',
        });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (customId === 'panel_ranking' && !exigirRol(interaction, ROLES.INSPECTOR)) {
        const embed = crearEmbedRespuesta({
          color: COLORS.danger || 0x8b0000,
          titulo: '❌ Acceso denegado',
          descripcion: 'No tienes permiso para consultar el ranking laboral.',
        });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (customId === 'panel_entrar') {
        const activa = obtenerJornadaActiva(userId, guildId);

        if (activa) {
          const embed = crearEmbedRespuesta({
            color: COLORS.warning || 0xf1c40f,
            titulo: '⚠️ Jornada ya activa',
            descripcion: 'Ya cuentas con una jornada activa dentro del sistema.',
            campos: [
              { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
              { name: '📌 Estado', value: 'ACTIVO', inline: true },
            ],
          });

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        crearEntrada(userId, username, guildId);

        const okEmbed = crearEmbedRespuesta({
          color: COLORS.success,
          titulo: '🟢 Entrada registrada',
          descripcion: 'La apertura de jornada fue registrada correctamente.',
          campos: [
            { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
            { name: '🧷 Usuario', value: username, inline: true },
            { name: '📌 Estado actual', value: 'ACTIVO', inline: true },
          ],
        });

        await interaction.editReply({ embeds: [okEmbed] });

        const rev = getUltimaRevision(guildId, userId);
        const dias = diasSinRevision(rev?.last_review_ts);

        if (dias !== null && dias > 7) {
          const avisoEmbed = crearEmbedRespuesta({
            color: COLORS.warning || 0xf1c40f,
            titulo: '🔴 Revisión pendiente',
            descripcion: 'Tienes una revisión pendiente crítica. Contacta a un supervisor.',
          });

          await interaction.followUp({
            embeds: [avisoEmbed],
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }

        const logEmbed = crearLogEntrada({
          userId,
          username,
          timezone: activeTimezone,
        });

        await enviarLogBitacora(guild, logChannelId, logEmbed);
        return;
      }

      if (customId === 'panel_salir') {
        const resultado = cerrarSalida(userId, guildId);

        if (!resultado) {
          const embed = crearEmbedRespuesta({
            color: COLORS.warning || 0xf1c40f,
            titulo: '⚠️ Sin jornada activa',
            descripcion: 'No tienes una jornada activa para registrar salida.',
          });

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const tiempo = formatearMinutos(resultado.minutos_trabajados);

        const okEmbed = crearEmbedRespuesta({
          color: COLORS.danger,
          titulo: '🔴 Salida registrada',
          descripcion: 'La jornada laboral fue cerrada correctamente.',
          campos: [
            { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
            { name: '🧷 Usuario', value: username, inline: true },
            { name: '⏱️ Tiempo trabajado', value: tiempo, inline: true },
          ],
        });

        await interaction.editReply({ embeds: [okEmbed] });

        const logEmbed = crearLogSalida({
          userId,
          username,
          tiempo,
          timezone: activeTimezone,
        });

        await enviarLogBitacora(guild, logChannelId, logEmbed);
        await renderDashboardLight(interaction.client, guildId).catch(() => {});
        return;
      }

      if (customId === 'panel_horas') {
        const acumulado = obtenerAcumulado(userId, guildId);
        const minutos = acumulado?.total_minutos || 0;
        const jornadas = acumulado?.total_jornadas || 0;

        const embed = crearEmbedRespuesta({
          color: COLORS.primary,
          titulo: '⏱️ Horas acumuladas',
          descripcion: 'Consulta personal de actividad laboral registrada.',
          campos: [
            { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
            { name: '⏱️ Tiempo acumulado', value: formatearMinutos(minutos), inline: true },
            { name: '📁 Jornadas cerradas', value: String(jornadas), inline: true },
          ],
        });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (customId === 'panel_ranking') {
        const top = topTrabajadores(guildId, 10);

        if (!top.length) {
          const embed = crearEmbedRespuesta({
            color: COLORS.warning || 0xf1c40f,
            titulo: '⚠️ Ranking no disponible',
            descripcion: 'No existen registros acumulados en el sistema.',
          });

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const descripcion = top.map((u, i) => {
          const icono =
            i === 0 ? '🥇' :
            i === 1 ? '🥈' :
            i === 2 ? '🥉' :
            '🏅';

          return [
            `${icono} **PUESTO ${i + 1}**`,
            `👤 Trabajador: <@${u.user_id}>`,
            `⏱️ Tiempo acumulado: **${formatearMinutos(u.total_minutos)}**`,
            `📁 Jornadas cerradas: **${u.total_jornadas}**`,
          ].join('\n');
        }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n');

        const embed = new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle('🏆 Ranking Laboral Institucional')
          .setDescription(descripcion)
          .setFooter({ text: FOOTERS.ranking || FOOTERS.official })
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
        });
        return;
      }
    } catch (error) {
      if (error?.code === 10062 || error?.code === 40060) {
        return;
      }

      console.error('❌ Error en interactionCreate:', error);

      if (!interaction) return;

      const errorEmbed = crearEmbedRespuesta({
        color: COLORS.danger || 0x8b0000,
        titulo: '❌ Error del sistema',
        descripcion: 'Ocurrió un error al procesar la interacción.',
      });

      if (interaction.deferred) {
        await interaction.editReply({
          embeds: [errorEmbed],
        }).catch(() => {});
      } else if (interaction.replied) {
        await interaction.followUp({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};