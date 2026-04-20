const fs = require('fs');
const path = require('path');

async function respaldarCanal(channel, options = {}) {
  const {
    limit = 1000,
    excludeMessageIds = [],
  } = options;

  const mensajes = [];
  let lastId;

  while (mensajes.length < limit) {
    const fetched = await channel.messages.fetch({
      limit: Math.min(100, limit - mensajes.length),
      before: lastId,
    });

    if (!fetched.size) break;

    const batch = [...fetched.values()]
      .filter(msg => !excludeMessageIds.includes(msg.id))
      .map(msg => ({
        id: msg.id,
        authorId: msg.author?.id || null,
        authorTag: msg.author?.tag || 'desconocido',
        content: msg.content || '',
        createdAt: msg.createdAt?.toISOString?.() || null,
        attachments: [...msg.attachments.values()].map(a => ({
          name: a.name,
          url: a.url,
          contentType: a.contentType || null,
          size: a.size || 0,
        })),
        embeds: msg.embeds.map(e => e.data),
        components: msg.components.map(c => c.toJSON()),
      }));

    mensajes.push(...batch);
    lastId = fetched.last().id;

    if (fetched.size < 100) break;
  }

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const baseName = `respaldo_${channel.guild.id}_${channel.id}_${Date.now()}`;
  const jsonPath = path.join(exportDir, `${baseName}.json`);

  const payload = {
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    channelId: channel.id,
    channelName: channel.name,
    exportedAt: new Date().toISOString(),
    totalMessages: mensajes.length,
    messages: mensajes.reverse(),
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  return {
    filePath: jsonPath,
    count: mensajes.length,
  };
}

async function limpiarCanal(channel, options = {}) {
  const {
    preserveMessageIds = [],
    maxMessagesToDelete = 1000,
  } = options;

  let borrados = 0;
  let revisados = 0;
  let lastId;

  while (revisados < maxMessagesToDelete) {
    const fetched = await channel.messages.fetch({
      limit: Math.min(100, maxMessagesToDelete - revisados),
      before: lastId,
    });

    if (!fetched.size) break;

    const mensajes = [...fetched.values()].filter(
      msg => !preserveMessageIds.includes(msg.id)
    );

    if (!mensajes.length) {
      lastId = fetched.last().id;
      revisados += fetched.size;
      continue;
    }

    const recientes = mensajes.filter(
      msg => Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
    );

    const antiguos = mensajes.filter(
      msg => Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
    );

    if (recientes.length) {
      const deleted = await channel.bulkDelete(recientes, true).catch(() => []);
      borrados += Array.isArray(deleted) ? deleted.length : deleted.size || 0;
    }

    for (const msg of antiguos) {
      await msg.delete().then(() => {
        borrados += 1;
      }).catch(() => {});
    }

    revisados += fetched.size;
    lastId = fetched.last().id;

    if (fetched.size < 100) break;
  }

  return { deletedCount: borrados };
}

module.exports = {
  respaldarCanal,
  limpiarCanal,
};