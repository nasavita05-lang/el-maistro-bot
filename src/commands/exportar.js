const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');

const { obtenerTodasLasJornadas } = require('../database/db');
const { COLORS, FOOTERS } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exportar')
    .setDescription('Exportar jornadas a CSV')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Este comando solo puede usarse dentro de un servidor.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const registros = obtenerTodasLasJornadas(interaction.guild.id);

    if (!registros.length) {
      const warnEmbed = new EmbedBuilder()
        .setColor(COLORS.warning || 0xf1c40f)
        .setTitle('⚠️ Exportación no disponible')
        .setDescription('No existen registros de jornadas para exportar en este servidor.')
        .setFooter({ text: FOOTERS.admin || FOOTERS.official })
        .setTimestamp();

      await interaction.editReply({
        embeds: [warnEmbed],
      });
      return;
    }

    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(
      exportDir,
      `jornadas_${interaction.guild.id}_${Date.now()}.csv`
    );

    const encabezados = [
      'id',
      'user_id',
      'username',
      'guild_id',
      'entrada_ts',
      'salida_ts',
      'minutos_trabajados',
      'estado',
      'fecha',
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
        `"${String(r.fecha).replace(/"/g, '""')}"`,
      ].join(','));
    }

    fs.writeFileSync(filePath, lineas.join('\n'), 'utf8');

    const archivo = new AttachmentBuilder(filePath);

    const okEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('📤 Exportación completada')
      .setDescription('La exportación institucional de jornadas fue generada correctamente en formato CSV.')
      .addFields(
        {
          name: '🏛️ Servidor',
          value: interaction.guild.name,
          inline: true,
        },
        {
          name: '📁 Registros exportados',
          value: String(registros.length),
          inline: true,
        },
        {
          name: '📄 Formato',
          value: 'CSV',
          inline: true,
        }
      )
      .setFooter({ text: FOOTERS.admin || FOOTERS.official })
      .setTimestamp();

    await interaction.editReply({
      embeds: [okEmbed],
      files: [archivo],
    });
  },
};