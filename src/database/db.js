const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const STORAGE_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.DATA_DIR ||
  path.join(__dirname, '../../storage');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const dbPath = path.join(STORAGE_DIR, 'data.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function obtenerFechaLocal(timezone = defaultTimezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function inicializarTablas() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jornadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      entrada_ts INTEGER NOT NULL,
      salida_ts INTEGER,
      minutos_trabajados INTEGER DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'activo',
      fecha TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS acumulados (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      username TEXT NOT NULL,
      total_minutos INTEGER NOT NULL DEFAULT 0,
      total_jornadas INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      guild_id TEXT PRIMARY KEY,
      guild_name TEXT,
      timezone TEXT,
      system_enabled INTEGER DEFAULT 1,
      categoria_id TEXT,
      panel_channel_id TEXT,
      log_channel_id TEXT,
      ranking_channel_id TEXT,
      expediente_log_channel_id TEXT,
      panel_message_id TEXT,
      ranking_message_id TEXT
    );

    CREATE TABLE IF NOT EXISTS configuracion_roles (
      guild_id TEXT PRIMARY KEY,
      administrador_role_id TEXT,
      supervisor_role_id TEXT,
      inspector_role_id TEXT,
      empleado_role_id TEXT
    );

    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT,
      username TEXT,
      accion TEXT NOT NULL,
      detalle TEXT,
      meta_json TEXT,
      ts INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ranking_cache (
      guild_id TEXT PRIMARY KEY,
      payload_json TEXT,
      last_update_ts INTEGER
    );

    CREATE TABLE IF NOT EXISTS revisiones (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      last_review_ts INTEGER,
      reviewer_id TEXT,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_jornadas_user_guild_estado
      ON jornadas(user_id, guild_id, estado);

    CREATE INDEX IF NOT EXISTS idx_jornadas_guild_id
      ON jornadas(guild_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_acumulados_guild_totales
      ON acumulados(guild_id, total_minutos DESC, total_jornadas DESC);

    CREATE INDEX IF NOT EXISTS idx_auditoria_guild_user
      ON auditoria(guild_id, user_id, id DESC);
  `);
}

function asegurarColumnasConfiguracion() {
  const columnas = db.prepare(`PRAGMA table_info(configuracion)`).all();
  const nombres = new Set(columnas.map(col => col.name));

  const columnasNecesarias = [
    ['guild_name', 'TEXT'],
    ['timezone', 'TEXT'],
    ['system_enabled', 'INTEGER DEFAULT 1'],
    ['categoria_id', 'TEXT'],
    ['panel_channel_id', 'TEXT'],
    ['log_channel_id', 'TEXT'],
    ['ranking_channel_id', 'TEXT'],
    ['expediente_log_channel_id', 'TEXT'],
    ['panel_message_id', 'TEXT'],
    ['ranking_message_id', 'TEXT'],
  ];

  for (const [nombre, tipo] of columnasNecesarias) {
    if (!nombres.has(nombre)) {
      db.exec(`ALTER TABLE configuracion ADD COLUMN ${nombre} ${tipo}`);
    }
  }
}

inicializarTablas();
asegurarColumnasConfiguracion();

function logAuditoria({ guildId, userId, username, accion, detalle, meta }) {
  db.prepare(`
    INSERT INTO auditoria (guild_id, user_id, username, accion, detalle, meta_json, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    userId || null,
    username || null,
    accion,
    detalle || null,
    meta ? JSON.stringify(meta) : null,
    Date.now()
  );
}

function obtenerJornadaActiva(userId, guildId) {
  return db.prepare(`
    SELECT * FROM jornadas
    WHERE user_id = ? AND guild_id = ? AND estado = 'activo'
    ORDER BY id DESC
    LIMIT 1
  `).get(userId, guildId);
}

function crearEntrada(userId, username, guildId) {
  const cfg = obtenerConfiguracionEfectiva(guildId);
  const ahora = Date.now();
  const fecha = obtenerFechaLocal(cfg.timezone);

  const res = db.prepare(`
    INSERT INTO jornadas (user_id, username, guild_id, entrada_ts, fecha)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, username, guildId, ahora, fecha);

  logAuditoria({
    guildId,
    userId,
    username,
    accion: 'ENTRADA',
    detalle: 'Inicio de jornada',
  });

  return res;
}

function cerrarSalida(userId, guildId) {
  const jornada = obtenerJornadaActiva(userId, guildId);
  if (!jornada) return null;

  const salida = Date.now();
  const minutos = Math.max(1, Math.floor((salida - jornada.entrada_ts) / 60000));

  const trx = db.transaction(() => {
    db.prepare(`
      UPDATE jornadas
      SET salida_ts = ?, minutos_trabajados = ?, estado = 'cerrado'
      WHERE id = ?
    `).run(salida, minutos, jornada.id);

    const existente = db.prepare(`
      SELECT * FROM acumulados
      WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId);

    if (existente) {
      db.prepare(`
        UPDATE acumulados
        SET total_minutos = total_minutos + ?,
            total_jornadas = total_jornadas + 1,
            username = ?
        WHERE user_id = ? AND guild_id = ?
      `).run(minutos, jornada.username, userId, guildId);
    } else {
      db.prepare(`
        INSERT INTO acumulados (user_id, guild_id, username, total_minutos, total_jornadas)
        VALUES (?, ?, ?, ?, 1)
      `).run(userId, guildId, jornada.username, minutos);
    }
  });

  trx();

  logAuditoria({
    guildId,
    userId,
    username: jornada.username,
    accion: 'SALIDA',
    detalle: 'Fin de jornada',
    meta: { minutos },
  });

  return {
    ...jornada,
    salida_ts: salida,
    minutos_trabajados: minutos,
    estado: 'cerrado',
  };
}

function obtenerAcumulado(userId, guildId) {
  return db.prepare(`
    SELECT * FROM acumulados
    WHERE user_id = ? AND guild_id = ?
  `).get(userId, guildId);
}

function obtenerHistorial(userId, guildId, limite = 10) {
  return db.prepare(`
    SELECT * FROM jornadas
    WHERE user_id = ? AND guild_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(userId, guildId, limite);
}

function topTrabajadores(guildId, limite = 10) {
  return db.prepare(`
    SELECT * FROM acumulados
    WHERE guild_id = ?
    ORDER BY total_minutos DESC, total_jornadas DESC
    LIMIT ?
  `).all(guildId, limite);
}

function obtenerTodasLasJornadas(guildId) {
  return db.prepare(`
    SELECT * FROM jornadas
    WHERE guild_id = ?
    ORDER BY id DESC
  `).all(guildId);
}

function obtenerConfiguracion(guildId) {
  return db.prepare(`
    SELECT * FROM configuracion
    WHERE guild_id = ?
  `).get(guildId);
}

function obtenerConfiguracionEfectiva(guildId) {
  const cfg = obtenerConfiguracion(guildId) || {};

  return {
    guild_id: guildId,
    guild_name: cfg.guild_name || null,
    timezone: cfg.timezone || defaultTimezone || 'America/Mexico_City',
    system_enabled: cfg.system_enabled ?? 1,

    categoria_id: cfg.categoria_id || null,
    panel_channel_id: cfg.panel_channel_id || defaultPanelChannelId || null,
    log_channel_id: cfg.log_channel_id || defaultLogChannelId || null,
    ranking_channel_id: cfg.ranking_channel_id || defaultRankingChannelId || null,
    expediente_log_channel_id: cfg.expediente_log_channel_id || null,

    panel_message_id: cfg.panel_message_id || null,
    ranking_message_id: cfg.ranking_message_id || null,
  };
}

function guardarConfiguracionCanales(guildId, data = {}) {
  const actual = obtenerConfiguracion(guildId);

  const merged = {
    guild_name: data.guild_name ?? actual?.guild_name ?? null,
    timezone: data.timezone ?? actual?.timezone ?? null,
    system_enabled: data.system_enabled ?? actual?.system_enabled ?? 1,
    categoria_id: data.categoria_id ?? actual?.categoria_id ?? null,
    panel_channel_id: data.panel_channel_id ?? actual?.panel_channel_id ?? null,
    log_channel_id: data.log_channel_id ?? actual?.log_channel_id ?? null,
    ranking_channel_id: data.ranking_channel_id ?? actual?.ranking_channel_id ?? null,
    expediente_log_channel_id: data.expediente_log_channel_id ?? actual?.expediente_log_channel_id ?? null,
    panel_message_id: data.panel_message_id ?? actual?.panel_message_id ?? null,
    ranking_message_id: data.ranking_message_id ?? actual?.ranking_message_id ?? null,
  };

  if (actual) {
    db.prepare(`
      UPDATE configuracion
      SET guild_name = ?,
          timezone = ?,
          system_enabled = ?,
          categoria_id = ?,
          panel_channel_id = ?,
          log_channel_id = ?,
          ranking_channel_id = ?,
          expediente_log_channel_id = ?,
          panel_message_id = ?,
          ranking_message_id = ?
      WHERE guild_id = ?
    `).run(
      merged.guild_name,
      merged.timezone,
      merged.system_enabled,
      merged.categoria_id,
      merged.panel_channel_id,
      merged.log_channel_id,
      merged.ranking_channel_id,
      merged.expediente_log_channel_id,
      merged.panel_message_id,
      merged.ranking_message_id,
      guildId
    );
  } else {
    db.prepare(`
      INSERT INTO configuracion (
        guild_id,
        guild_name,
        timezone,
        system_enabled,
        categoria_id,
        panel_channel_id,
        log_channel_id,
        ranking_channel_id,
        expediente_log_channel_id,
        panel_message_id,
        ranking_message_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      merged.guild_name,
      merged.timezone,
      merged.system_enabled,
      merged.categoria_id,
      merged.panel_channel_id,
      merged.log_channel_id,
      merged.ranking_channel_id,
      merged.expediente_log_channel_id,
      merged.panel_message_id,
      merged.ranking_message_id
    );
  }
}

function registrarGuildSiNoExiste(guild) {
  if (!guild?.id) return;

  const actual = obtenerConfiguracion(guild.id);
  if (actual) {
    if (guild.name && actual.guild_name !== guild.name) {
      guardarConfiguracionCanales(guild.id, { guild_name: guild.name });
    }
    return;
  }

  guardarConfiguracionCanales(guild.id, {
    guild_name: guild.name || null,
    timezone: defaultTimezone || 'America/Mexico_City',
    system_enabled: 1,
  });
}

function guardarPanelMessageId(guildId, messageId) {
  guardarConfiguracionCanales(guildId, { panel_message_id: messageId });
}

function guardarRankingMessageId(guildId, messageId) {
  guardarConfiguracionCanales(guildId, { ranking_message_id: messageId });
}

function obtenerPanelMessageId(guildId) {
  return obtenerConfiguracion(guildId)?.panel_message_id || null;
}

function obtenerRankingMessageId(guildId) {
  return obtenerConfiguracion(guildId)?.ranking_message_id || null;
}

function obtenerConfiguracionRoles(guildId) {
  return db.prepare(`
    SELECT * FROM configuracion_roles
    WHERE guild_id = ?
  `).get(guildId);
}

function guardarConfiguracionRoles({
  guildId,
  administradorRoleId,
  supervisorRoleId,
  inspectorRoleId,
  empleadoRoleId,
}) {
  const actual = obtenerConfiguracionRoles(guildId);

  const merged = {
    administrador_role_id: administradorRoleId ?? actual?.administrador_role_id ?? null,
    supervisor_role_id: supervisorRoleId ?? actual?.supervisor_role_id ?? null,
    inspector_role_id: inspectorRoleId ?? actual?.inspector_role_id ?? null,
    empleado_role_id: empleadoRoleId ?? actual?.empleado_role_id ?? null,
  };

  db.prepare(`
    INSERT INTO configuracion_roles (
      guild_id,
      administrador_role_id,
      supervisor_role_id,
      inspector_role_id,
      empleado_role_id
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      administrador_role_id = excluded.administrador_role_id,
      supervisor_role_id = excluded.supervisor_role_id,
      inspector_role_id = excluded.inspector_role_id,
      empleado_role_id = excluded.empleado_role_id
  `).run(
    guildId,
    merged.administrador_role_id,
    merged.supervisor_role_id,
    merged.inspector_role_id,
    merged.empleado_role_id
  );
}

function obtenerAuditoria(guildId, userId, limite = 10) {
  return db.prepare(`
    SELECT * FROM auditoria
    WHERE guild_id = ? AND user_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(guildId, userId, limite);
}

function setRankingCache(guildId, payload) {
  db.prepare(`
    INSERT INTO ranking_cache (guild_id, payload_json, last_update_ts)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      payload_json = excluded.payload_json,
      last_update_ts = excluded.last_update_ts
  `).run(guildId, JSON.stringify(payload), Date.now());
}

function getRankingCache(guildId) {
  const row = db.prepare(`
    SELECT * FROM ranking_cache
    WHERE guild_id = ?
  `).get(guildId);

  return row ? JSON.parse(row.payload_json) : null;
}

function shouldUpdateRanking(guildId) {
  const row = db.prepare(`
    SELECT last_update_ts FROM ranking_cache
    WHERE guild_id = ?
  `).get(guildId);

  if (!row) return true;
  return (Date.now() - row.last_update_ts) > 60000;
}

function setUltimaRevision(guildId, userId, reviewerId) {
  db.prepare(`
    INSERT INTO revisiones (guild_id, user_id, last_review_ts, reviewer_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      last_review_ts = excluded.last_review_ts,
      reviewer_id = excluded.reviewer_id
  `).run(guildId, userId, Date.now(), reviewerId);
}

function getUltimaRevision(guildId, userId) {
  return db.prepare(`
    SELECT * FROM revisiones
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId);
}

module.exports = {
  db,

  obtenerJornadaActiva,
  crearEntrada,
  cerrarSalida,
  obtenerAcumulado,
  obtenerHistorial,
  topTrabajadores,
  obtenerTodasLasJornadas,

  obtenerConfiguracion,
  obtenerConfiguracionEfectiva,
  guardarConfiguracionCanales,
  registrarGuildSiNoExiste,
  guardarPanelMessageId,
  guardarRankingMessageId,
  obtenerPanelMessageId,
  obtenerRankingMessageId,

  guardarConfiguracionRoles,
  obtenerConfiguracionRoles,

  logAuditoria,
  obtenerAuditoria,

  setRankingCache,
  getRankingCache,
  shouldUpdateRanking,

  setUltimaRevision,
  getUltimaRevision,
};