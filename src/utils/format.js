function formatearMinutos(minutos = 0) {
  const total = Math.max(0, Number(minutos) || 0);
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  return `${horas}h ${mins}m`;
}

function fechaBonita(timestamp = Date.now(), timezone = 'America/Mexico_City') {
  const fecha = new Date(timestamp);

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

module.exports = {
  formatearMinutos,
  fechaBonita,
};