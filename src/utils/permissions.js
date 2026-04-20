const { PermissionFlagsBits } = require('discord.js');
const { obtenerConfiguracionRoles } = require('../database/db');

const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  INSPECTOR: 'inspector',
  EMPLEADO: 'empleado',
};

function memberHasRole(member, roleId) {
  if (!member || !roleId) return false;
  return member.roles?.cache?.has(roleId) || false;
}

function memberHasNativeAdmin(member) {
  if (!member?.permissions) return false;

  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

function getRoleConfig(guildId) {
  if (!guildId) return {};
  return obtenerConfiguracionRoles(guildId) || {};
}

function esAdmin(member, guildId, config = null) {
  const cfg = config || getRoleConfig(guildId);
  return (
    memberHasRole(member, cfg.administrador_role_id) ||
    memberHasNativeAdmin(member)
  );
}

function esSupervisor(member, guildId, config = null) {
  const cfg = config || getRoleConfig(guildId);
  return (
    memberHasRole(member, cfg.supervisor_role_id) ||
    esAdmin(member, guildId, cfg)
  );
}

function esInspector(member, guildId, config = null) {
  const cfg = config || getRoleConfig(guildId);
  return (
    memberHasRole(member, cfg.inspector_role_id) ||
    esSupervisor(member, guildId, cfg)
  );
}

function esEmpleado(member, guildId, config = null) {
  const cfg = config || getRoleConfig(guildId);
  return (
    memberHasRole(member, cfg.empleado_role_id) ||
    esInspector(member, guildId, cfg)
  );
}

function exigirRol(interaction, nivel) {
  const member = interaction?.member;
  const guildId = interaction?.guild?.id;

  if (!member || !guildId) return false;

  const config = getRoleConfig(guildId);

  if (nivel === ROLES.ADMIN) return esAdmin(member, guildId, config);
  if (nivel === ROLES.SUPERVISOR) return esSupervisor(member, guildId, config);
  if (nivel === ROLES.INSPECTOR) return esInspector(member, guildId, config);
  if (nivel === ROLES.EMPLEADO) return esEmpleado(member, guildId, config);

  return false;
}

module.exports = {
  ROLES,
  esAdmin,
  esSupervisor,
  esInspector,
  esEmpleado,
  exigirRol,
};