const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { obtenerTodasLasJornadas } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exportar')
    .setDescription('Exportar jornadas a CSV')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const registros = obtenerTodasLasJornadas(interaction.guild.id);

    if (!registros.length) {
      return interaction.editReply({ content: 'No hay registros para exportar.' });
    }

    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(exportDir, `jornadas_${interaction.guild.id}_${Date.now()}.csv`);

    const encabezados = [
      'id',
      'user_id',
      'username',
      'guild_id',
      'entrada_ts',
      'salida_ts',
      'minutos_trabajados',
      'estado',
      'fecha'
    ];

    const lineas = [encabezados.join(',')];

    for (const r of registros) {
      lineas.push([
        r.id,
        `"${String(r.user_id).replace(/"/g, '""')}"`,
        `"${String(r.username).replace(/"/g, '""')}"`,
        `"${String(r.guild_id).replace(/"/g, '""')}"`,
        r.entrada_ts ?? '',
        r.salida_ts ?? '',
        r.minutos_trabajados ?? 0,
        `"${String(r.estado).replace(/"/g, '""')}"`,
        `"${String(r.fecha).replace(/"/g, '""')}"`
      ].join(','));
    }

    fs.writeFileSync(filePath, lineas.join('\n'), 'utf8');

    const archivo = new AttachmentBuilder(filePath);

    return interaction.editReply({
      content: 'Aquí tienes la exportación CSV.',
      files: [archivo]
    });
  },
};