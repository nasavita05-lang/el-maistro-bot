const LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  READY: 'READY',
  CMD: 'CMD',
  DB: 'DB',
};

function now() {
  return new Date().toLocaleString('es-MX', {
    hour12: false,
    timeZone: process.env.TZ || 'America/Mexico_City',
  });
}

function format(level, message, meta = {}) {
  const extra = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join(' | ');

  return `[${now()}] [${level}] ${message}${extra ? ` | ${extra}` : ''}`;
}

function write(level, message, meta) {
  const line = format(level, message, meta);

  if (level === LEVELS.ERROR) {
    console.error(line);
    return;
  }

  if (level === LEVELS.WARN) {
    console.warn(line);
    return;
  }

  console.log(line);
}

module.exports = {
  LEVELS,
  info: (message, meta) => write(LEVELS.INFO, message, meta),
  warn: (message, meta) => write(LEVELS.WARN, message, meta),
  error: (message, meta) => write(LEVELS.ERROR, message, meta),
  ready: (message, meta) => write(LEVELS.READY, message, meta),
  cmd: (message, meta) => write(LEVELS.CMD, message, meta),
  db: (message, meta) => write(LEVELS.DB, message, meta),
};
