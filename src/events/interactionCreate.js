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

      if (interaction.deferred || interaction.replied) {
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      if (tieneCooldown(userId, customId)) {
        await interaction.editReply({
          content: '⏳ Espera unos segundos antes de volver a usar este botón.',
        });
        return;
      }

      const config = obtenerConfiguracionEfectiva(guildId);

      if (!config.system_enabled) {
        await interaction.editReply({
          content: '⚠️ El sistema está deshabilitado en este servidor.',
        });
        return;
      }

      const logChannelId = config.log_channel_id || '';
      const activeTimezone = config.timezone || timezone;

      const requiereRolEmpleado = ['panel_entrar', 'panel_salir', 'panel_horas'];

      if (requiereRolEmpleado.includes(customId) && !exigirRol(interaction, ROLES.EMPLEADO)) {
        await interaction.editReply({
          content: '❌ No tienes permiso para usar este panel laboral.',
        });
        return;
      }

      if (customId === 'panel_ranking' && !exigirRol(interaction, ROLES.INSPECTOR)) {
        await interaction.editReply({
          content: '❌ No tienes permiso para consultar el ranking.',
        });
        return;
      }

      if (customId === 'panel_entrar') {
        const activa = obtenerJornadaActiva(userId, guildId);

        if (activa) {
          await interaction.editReply({
            content: '⚠️ Ya tienes una jornada activa.',
          });
          return;
        }

        crearEntrada(userId, username, guildId);

        await interaction.editReply({
          content: '✅ Entrada registrada correctamente.',
        });

        const rev = getUltimaRevision(guildId, userId);
        const dias = diasSinRevision(rev?.last_review_ts);

        if (dias !== null && dias > 7) {
          await interaction.followUp({
            content: '🔴 Tienes una revisión pendiente crítica. Contacta a un supervisor.',
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }

        const logEmbed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('📘 REGISTRO DE BITÁCORA')
          .setDescription([
            '━━━━━━━━━━━━━━━━━━━━',
            '🟢 **MOVIMIENTO REGISTRADO: ENTRADA A SERVICIO**',
            '━━━━━━━━━━━━━━━━━━━━',
          ].join('\n'))
          .addFields(
            { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
            { name: '🧷 Usuario Discord', value: username, inline: true },
            { name: '📌 Estado actual', value: 'ACTIVO', inline: true },
            {
              name: '🕓 Fecha de registro',
              value: new Intl.DateTimeFormat('es-MX', {
                timeZone: activeTimezone,
                dateStyle: 'full',
                timeStyle: 'short',
              }).format(new Date()),
            },
            {
              name: '📄 Observación del sistema',
              value: 'Se abrió correctamente una nueva jornada laboral dentro del sistema oficial de bitácora.',
            }
          )
          .setFooter({ text: FOOTERS.official })
          .setTimestamp();

        await enviarLogBitacora(guild, logChannelId, logEmbed);
        return;
      }

      if (customId === 'panel_salir') {
        const resultado = cerrarSalida(userId, guildId);

        if (!resultado) {
          await interaction.editReply({
            content: '⚠️ No tienes una jornada activa.',
          });
          return;
        }

        const tiempo = formatearMinutos(resultado.minutos_trabajados);

        await interaction.editReply({
          content: `✅ Salida registrada. Tiempo trabajado: ${tiempo}`,
        });

        const logEmbed = new EmbedBuilder()
          .setColor(COLORS.danger)
          .setTitle('📘 REGISTRO DE BITÁCORA')
          .setDescription([
            '━━━━━━━━━━━━━━━━━━━━',
            '🔴 **MOVIMIENTO REGISTRADO: SALIDA DE SERVICIO**',
            '━━━━━━━━━━━━━━━━━━━━',
          ].join('\n'))
          .addFields(
            { name: '👤 Trabajador', value: `<@${userId}>`, inline: true },
            { name: '🧷 Usuario Discord', value: username, inline: true },
            { name: '📌 Estado actual', value: 'CERRADO', inline: true },
            { name: '⏱️ Tiempo laborado', value: tiempo, inline: true },
            {
              name: '🕓 Fecha de registro',
              value: new Intl.DateTimeFormat('es-MX', {
                timeZone: activeTimezone,
                dateStyle: 'full',
                timeStyle: 'short',
              }).format(new Date()),
              inline: true,
            },
            {
              name: '📄 Observación del sistema',
              value: 'La jornada laboral fue cerrada correctamente y los datos quedaron asentados en la bitácora oficial.',
            }
          )
          .setFooter({ text: FOOTERS.official })
          .setTimestamp();

        await enviarLogBitacora(guild, logChannelId, logEmbed);
        await renderDashboardLight(interaction.client, guildId).catch(() => {});
        return;
      }

      if (customId === 'panel_horas') {
        const acumulado = obtenerAcumulado(userId, guildId);
        const minutos = acumulado?.total_minutos || 0;
        const jornadas = acumulado?.total_jornadas || 0;

        await interaction.editReply({
          content: `⏱️ Tiempo acumulado: ${formatearMinutos(minutos)} | 📁 Jornadas: ${jornadas}`,
        });
        return;
      }

      if (customId === 'panel_ranking') {
        const top = topTrabajadores(guildId, 10);

        if (!top.length) {
          await interaction.editReply({
            content: 'No existen registros acumulados en el sistema.',
          });
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
        }).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');

        const embed = new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle('🏆 Ranking Laboral')
          .setDescription(descripcion)
          .setFooter({ text: FOOTERS.ranking })
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

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Ocurrió un error al procesar la interacción.',
        }).catch(() => {});
      } else if (interaction.replied) {
        await interaction.followUp({
          content: '❌ Ocurrió un error al procesar la interacción.',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error al procesar la interacción.',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};