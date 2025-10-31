import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Interaction } from 'discord.js';
import { getPlayerStats, getMatchHistory, getHeroInfo, getSteamProfile, getRanksData, DeadlockRank } from './deadlockApi';
import { getMatchMetadata, DeadlockMatchMetadata } from './deadlockApi';
import { generateMatchImage, MatchImageData, PlayerStats } from './utils/matchImage';
import { AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Global ranks cache
let ranksData: DeadlockRank[] = [];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const storagePath = path.join(__dirname, 'storage.json');
function readStorage() {
  if (!fs.existsSync(storagePath)) {
    return { steamIds: [], channelId: null, lastMatchIds: {} };
  }
  const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  if (!data.lastMatchIds) data.lastMatchIds = {};
  return data;
}
function writeStorage(data: any) {
  fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
}

client.once('clientReady', async () => {
  // Fetch ranks data on app start
  try {
    ranksData = await getRanksData();
    console.log('Ranks data loaded:', ranksData.length);
  } catch (err) {
    console.error('Failed to fetch ranks data:', err);
  }
  console.log(`Logged in as ${client.user?.tag}!`);

  // Register slash command for a specific guild (instant)
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
  const commands = [
    new SlashCommandBuilder()
      .setName('deadlock')
      .setDescription('Replies with hi'),
    new SlashCommandBuilder()
      .setName('deadlockstats')
      .setDescription('Get Deadlock stats for a Steam ID')
      .addStringOption(option =>
        option.setName('steamid')
          .setDescription('Steam ID to fetch stats for')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('addsteamid')
      .setDescription('Add a Steam ID to the notification list')
      .addStringOption(option =>
        option.setName('steamid')
          .setDescription('Steam ID to add')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('removesteamid')
      .setDescription('Remove a Steam ID from the notification list')
      .addStringOption(option =>
        option.setName('steamid')
          .setDescription('Steam ID to remove')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('setnotifychannel')
      .setDescription('Set the Discord channel for match notifications')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to send notifications to')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('liststeamids')
      .setDescription('List all Steam IDs in the notification list'),
  ];
  const guildId = '329324442368868354'; // Your provided guild ID
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user!.id, guildId),
  { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log('Slash command /deadlock registered for guild:', guildId);
  } catch (error) {
    console.error('Error registering slash command:', error);
  }
});


client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const storage = readStorage();
  if (interaction.commandName === 'deadlock') {
    await interaction.reply('hi');
  }
  if (interaction.commandName === 'deadlockstats') {
    const steamId = interaction.options.getString('steamid', true);
    try {
      const stats = await getPlayerStats(steamId);
      await interaction.reply(`Stats for Steam ID ${steamId}:\n${JSON.stringify(stats, null, 2)}`);
    } catch (error: any) {
      await interaction.reply(`Failed to fetch stats: ${error.message}`);
    }
  }
  if (interaction.commandName === 'addsteamid') {
    const steamId = interaction.options.getString('steamid', true);
    if (!storage.steamIds.includes(steamId)) {
      storage.steamIds.push(steamId);
      writeStorage(storage);
      await interaction.reply(`Steam ID ${steamId} added.`);
    } else {
      await interaction.reply(`Steam ID ${steamId} is already in the list.`);
    }
  }
  if (interaction.commandName === 'removesteamid') {
    const steamId = interaction.options.getString('steamid', true);
    if (storage.steamIds.includes(steamId)) {
      storage.steamIds = storage.steamIds.filter((id: string) => id !== steamId);
      if (storage.lastMatchIds) {
        delete storage.lastMatchIds[steamId];
      }
      writeStorage(storage);
      await interaction.reply(`Steam ID ${steamId} removed.`);
    } else {
      await interaction.reply(`Steam ID ${steamId} not found in the list.`);
    }
  }
  if (interaction.commandName === 'setnotifychannel') {
    const channel = interaction.options.getChannel('channel', true);
    storage.channelId = channel.id;
    writeStorage(storage);
    await interaction.reply(`Notification channel set to <#${channel.id}>.`);
  }
  if (interaction.commandName === 'liststeamids') {
    if (storage.steamIds.length === 0) {
      await interaction.reply('No Steam IDs stored.');
    } else {
      await interaction.reply(`Stored Steam IDs:\n${storage.steamIds.join(', ')}`);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN!);

// --- Periodic match notification feature ---
async function notifyRecentMatches() {
  const storage = readStorage();
  if (!storage.channelId || storage.steamIds.length === 0) return;
  const channel = await client.channels.fetch(storage.channelId).catch(() => null);
  if (!channel || !('send' in channel)) return;
  let storageChanged = false;
  const matchGroups: { [matchId: string]: { players: any[] } } = {};
  for (const steamId of storage.steamIds) {
    try {
      const matches = await getMatchHistory(steamId);
      const match = Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
      if (!match) {
        continue;
      }
      const lastSentId = storage.lastMatchIds[steamId];
      if (lastSentId === match.match_id) {
        continue; // Already sent this match
      }
      if (!matchGroups[match.match_id]) {
        matchGroups[match.match_id] = { players: [] };
      }
      matchGroups[match.match_id].players.push(match);
    } catch (error: any) {
      await channel.send(`Failed to fetch match for Steam ID ${steamId}: ${error.message}`);
    }
  }

  // For each match group, gather all required data and send image
  for (const matchId in matchGroups) {
    const group = matchGroups[matchId];
    const matchData = await gatherMatchImageData(group.players, matchId);
    if (!matchData) {
      console.log(`Failed to gather data for match ${matchId}`);
      continue;
    }

    const imageBuffer = await generateMatchImage(matchData);
    const attachment = new AttachmentBuilder(imageBuffer, { name: `match_${matchId}.png` });
    await channel.send({ files: [attachment] });

    group.players.forEach(p => {
      storage.lastMatchIds[p.account_id] = matchId;
    });
    storageChanged = true;
  }
  if (storageChanged) writeStorage(storage);
}

//test deploy

// Gather all required data for match image
async function gatherMatchImageData(players: any[], matchId: string): Promise<MatchImageData | undefined> {
  // Fetch full match metadata from Deadlock API
  try {
    const metadata: DeadlockMatchMetadata = await getMatchMetadata(Number(matchId));

    const teamA: PlayerStats[] = [];
    const teamB: PlayerStats[] = [];
    let teamAName = 'THE SAPPHIRE FLAME';
    let teamBName = 'THE AMBER HAND';
    let teamAColor = '#2a3a6a';
    let teamBColor = '#6a5a2a';
    let teamAVictory = metadata.winning_team === 'Team0';
    let teamBVictory = metadata.winning_team === 'Team1';
    let totalSoulsA = 0;
    let totalSoulsB = 0;
    let duration = '';

    if (metadata.duration_s) {
      const min = Math.floor(metadata.duration_s / 60);
      const sec = metadata.duration_s % 60;
      duration = `${min}:${sec.toString().padStart(2, '0')}`;
    }

    // --- Rank icon logic ---
    function getRankIconPath(avgBadge: number): string {
      // avgBadge: first digit is tier, second is subrank
      if (!ranksData || !Array.isArray(ranksData) || ranksData.length === 0) return '';

      // fallback to tier 0
      const fallback = ranksData.find(r => r.tier === 0);

      const badgeStr = avgBadge.toString().padStart(2, '0');
      const tier = Number(badgeStr[0]);
      const subrank = Number(badgeStr[1]);
      let rank = ranksData.find(r => r.tier === tier);
      if (!rank || tier === 0) {
        return fallback ? fallback.images.large : '';
      }

      const key = `large_subrank${subrank}`;
      return rank.images[key as keyof typeof rank.images] as string || '';
    }

    const rankIconPathA = getRankIconPath(metadata.average_badge_team0);
    const rankIconPathB = getRankIconPath(metadata.average_badge_team1);

    for (const player of metadata.players) {
      const heroInfo = await getHeroInfo(player.hero_id);
      const steamProfile = await getSteamProfile(player.account_id?.toString() ?? '');
      // Use last stats snapshot for final values
      const lastStats = Array.isArray(player.stats) && player.stats.length > 0 ? player.stats[player.stats.length - 1] as import('./deadlockApi').DeadlockPlayerStats : { player_damage: 0, boss_damage: 0, player_healing: 0 };
      const stats: PlayerStats = {
        nickname: steamProfile.nickname,
        avatar: steamProfile.avatar,
        heroName: heroInfo.name,
        heroImage: heroInfo.image,
        souls: player.net_worth ?? 0,
        kills: player.kills ?? 0,
        deaths: player.deaths ?? 0,
        assists: player.assists ?? 0,
        playerDmg: lastStats.player_damage ?? 0,
        objDmg: lastStats.boss_damage ?? 0,
        healing: lastStats.player_healing ?? 0,
      };
      if (player.team === 'Team0') {
        teamA.push(stats);
        totalSoulsA += stats.souls;
      } else {
        teamB.push(stats);
        totalSoulsB += stats.souls;
      }
    }

    return {
      matchId: metadata.match_id.toString(),
      duration,
      teamA: {
        name: teamAName,
        color: teamAColor,
        victory: teamAVictory,
        totalSouls: Math.round(totalSoulsA / 1000),
        players: teamA,
        rankIconPath: rankIconPathA,
      },
      teamB: {
        name: teamBName,
        color: teamBColor,
        victory: teamBVictory,
        totalSouls: Math.round(totalSoulsB / 1000),
        players: teamB,
        rankIconPath: rankIconPathB,
      },
    };
  } catch (err: any) {
    console.error(`Failed to fetch match metadata for matchId ${matchId}:`, err);
    return undefined
  }
}

// Poll every 1 minutes
setInterval(() => {
  if (client.isReady()) {
    notifyRecentMatches();
  }
}, 1 * 10 * 1000);
