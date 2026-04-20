const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config');

const commands = [];
const namesMap = new Map();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command?.data || typeof command.execute !== 'function') {
    console.warn(`⚠️ Comando inválido ignorado: ${file}`);
    continue;
  }

  const json = command.data.toJSON();
  const name = json.name;

  console.log(`📦 ${file} -> /${name}`);

  if (!namesMap.has(name)) {
    namesMap.set(name, []);
  }

  namesMap.get(name).push(file);
  commands.push(json);
}

const duplicates = [...namesMap.entries()].filter(([, files]) => files.length > 1);

if (duplicates.length > 0) {
  console.error('\n❌ Se encontraron nombres de comandos duplicados:\n');

  for (const [name, files] of duplicates) {
    console.error(`/${name} -> ${files.join(', ')}`);
  }

  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`\n⏳ Registrando ${commands.length} comandos...\n`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('✅ Comandos registrados correctamente.');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
})();