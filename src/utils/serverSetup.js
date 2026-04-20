const { ChannelType, PermissionsBitField } = require('discord.js');
const {
  guardarConfiguracionCanales,
  obtenerConfiguracion,
} = require('../database/db');

async function buscarOCrearCanalEnCategoria(categoria, nombre) {
  const existente = categoria.children.cache.find(
    ch => ch.type === ChannelType.GuildText && ch.name === nombre
  );

  if (existente) return existente;

  return categoria.children.create({
    name: nombre,
    type: ChannelType.GuildText,
    topic: `Canal automático del sistema laboral: ${nombre}`,
  });
}

async function crearCanalesSistemaEnCategoria(guild, categoria) {
  if (categoria.type !== ChannelType.GuildCategory) {
    throw new Error('La opción proporcionada no es una categoría válida.');
  }

  const panel = await buscarOCrearCanalEnCategoria(categoria, 'panel-laboral');
  const logs = await buscarOCrearCanalEnCategoria(categoria, 'logs-registro-bitacora');
  const ranking = await buscarOCrearCanalEnCategoria(categoria, 'ranking-laboral');
  const expediente = await buscarOCrearCanalEnCategoria(categoria, 'logs-datos-empleado');

  guardarConfiguracionCanales(guild.id, {
    categoria_id: categoria.id,
    panel_channel_id: panel.id,
    log_channel_id: logs.id,
    ranking_channel_id: ranking.id,
    expediente_log_channel_id: expediente.id,
  });

  return { panel, logs, ranking, expediente };
}

function obtenerCanalesSistema(guildId) {
  return obtenerConfiguracion(guildId) || null;
}

module.exports = {
  crearCanalesSistemaEnCategoria,
  obtenerCanalesSistema,
};