const { ChannelType } = require('discord.js');
const {
  obtenerConfiguracionEfectiva,
  obtenerRankingMessageId,
} = require('../database/db');
const { respaldarCanal } = require('./archive');

async function resolverCanalTexto(guild, channelId) {
  if (!guild || !channelId) return null;

  const canal = await guild.channels.fetch(channelId).catch(() => null);
  if (!canal) return null;

  return canal.type === ChannelType.GuildText ? canal : null;
}

async function ejecutarRespaldoAutomatico(guild) {
  if (!guild) return;

  const config = obtenerConfiguracionEfectiva(guild.id);
  if (!config.system_enabled) return;

  const logId = config.log_channel_id || '';
  const rankingId = config.ranking_channel_id || '';

  const objetivos = [];

  const canalLogs = await resolverCanalTexto(guild, logId);
  if (canalLogs) objetivos.push(canalLogs);

  const canalRanking = await resolverCanalTexto(guild, rankingId);
  if (canalRanking) objetivos.push(canalRanking);

  if (!objetivos.length) {
    console.log(`⚠️ [${guild.name}] No hay canales configurados para respaldo automático.`);
    return;
  }

  for (const canal of objetivos) {
    try {
      const excludeIds = [];

      if (canal.id === rankingId) {
        const rankingMessageId = obtenerRankingMessageId(guild.id);
        if (rankingMessageId) excludeIds.push(rankingMessageId);
      }

      const respaldo = await respaldarCanal(canal, {
        excludeMessageIds: excludeIds,
        limit: 5000,
      });

      console.log(`💾 [${guild.name}] Respaldo automático: #${canal.name} → ${respaldo.count} mensajes`);
    } catch (error) {
      console.error(`❌ [${guild.name}] Error en respaldo automático de #${canal.name}:`, error);
    }
  }
}

function iniciarRespaldoAutomatico(guild, intervalMs = 60 * 60 * 1000) {
  console.log(`🕒 [${guild.name}] Respaldo automático activado cada ${Math.floor(intervalMs / 60000)} minutos.`);

  ejecutarRespaldoAutomatico(guild).catch(error => {
    console.error(`❌ [${guild.name}] Error en respaldo automático inicial:`, error);
  });

  const timer = setInterval(() => {
    ejecutarRespaldoAutomatico(guild).catch(error => {
      console.error(`❌ [${guild.name}] Error en respaldo automático programado:`, error);
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

module.exports = {
  ejecutarRespaldoAutomatico,
  iniciarRespaldoAutomatico,
};