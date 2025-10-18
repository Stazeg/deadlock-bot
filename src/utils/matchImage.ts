import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';

export interface PlayerStats {
  nickname: string;
  avatar: string;
  heroName: string;
  heroImage: string;
  souls: number;
  kills: number;
  deaths: number;
  assists: number;
  playerDmg: number;
  objDmg: number;
  healing: number;
}

export interface TeamStats {
  name: string;
  color: string; // e.g. '#2a3a6a' or '#6a5a2a'
  victory: boolean;
  totalSouls: number;
  players: PlayerStats[];
  rankIconPath: string;
}

export interface MatchImageData {
  matchId: string;
  duration: string;
  teamA: TeamStats;
  teamB: TeamStats;
}

// Draws a team stats bar above the team columns
async function drawTeamStatsBar(ctx: any, x: number, y: number, width: number, team: TeamStats, kills: number, souls: number, damage: number, victory: boolean, rankIconPath?: string) {
  // Bar styling
  const barHeight = 80;
  const accentWidth = 6;
  const iconSize = 54;
  const padding = 24;
  const statGap = 80;
  const statFont = 'bold 24px Arial';
  const labelFont = 'bold 16px Arial';
  const nameFont = 'bold 28px Arial';
  const resultFont = 'bold 22px Arial';

  // Bar background
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + barHeight);
  ctx.lineTo(x, y + barHeight);
  ctx.closePath();
  ctx.fillStyle = '#181818';
  ctx.globalAlpha = 0.98;
  ctx.fill();
  ctx.restore();

  // Accent line
  ctx.save();
  ctx.fillStyle = team.color;
  ctx.fillRect(x, y, accentWidth, barHeight);
  ctx.restore();

  // Rank icon (if provided)
  if (rankIconPath) {
    try {
      const iconImg = await loadImage(rankIconPath);
      ctx.drawImage(iconImg, x + accentWidth + padding, y + (barHeight - iconSize) / 2, iconSize, iconSize);
    } catch {}
  }

  // Team name
  ctx.font = nameFont;
  ctx.fillStyle = team.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(team.name, x + accentWidth + padding + iconSize + 18, y + 12);

  // Dynamically calculate statStartX based on team name width
  const nameWidth = ctx.measureText(team.name).width;

  // Victory/Defeat
  ctx.font = resultFont;
  ctx.fillStyle = victory ? '#ffe7c2' : '#c2c2c2';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(victory ? 'VICTORY' : 'DEFEAT', x + accentWidth + padding + iconSize + 18, y + 46);

  // Stats: kills, souls, damage
  
  // 18px after icon, plus name width, plus 64px after name
  const statStartX = x + accentWidth + padding + iconSize + 18 + nameWidth + 64;
  const statY = y + 18;
  const stats = [
    { value: kills, label: 'KILLS' },
    { value: souls, label: 'SOULS' },
    { value: damage, label: 'DAMAGE' }
  ];

  for (let i = 0; i < stats.length; i++) {
    const sx = statStartX + i * statGap;
    ctx.font = statFont;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Format value (e.g. 199K for souls, always add 'K' for souls)
    let valStr;
    if (stats[i].label === 'SOULS') {
      valStr = `${stats[i].value}K`;
    } else {
      valStr = stats[i].value >= 1000 ? `${Math.round(stats[i].value / 1000)}K` : stats[i].value.toString();
    }
    ctx.fillText(valStr, sx, statY);
    ctx.font = labelFont;
    ctx.fillStyle = '#c2c2c2';
    ctx.textBaseline = 'top';
    ctx.fillText(stats[i].label, sx, statY + 38);
  }
}

// Draws the top info bar with match duration
function drawTopInfoBar(ctx: any, width: number,  duration: string) {
  const topBarY = 80;
  const barHeight = 56;
  const barRadius = 14;
  const fontDuration = 'bold 28px Arial';
  const centerX = width / 2;
  
  // TODO: change shape to rectangle with rounded ends
  // Draw center duration box
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX - 48, topBarY);
  ctx.lineTo(centerX + 48, topBarY);
  ctx.arc(centerX + 48, topBarY + barRadius, barRadius, -Math.PI/2, Math.PI/2);
  ctx.lineTo(centerX + 48, topBarY + barHeight - barRadius);
  ctx.arc(centerX - 48, topBarY + barHeight - barRadius, barRadius, Math.PI/2, -Math.PI/2);
  ctx.closePath();
  ctx.fillStyle = '#181818';
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.restore();

  // Draw duration text
  ctx.font = fontDuration;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(duration, centerX, topBarY + barHeight / 2);
}

export async function generateMatchImage(data: MatchImageData): Promise<Buffer> {
  // Helper to format numbers with commas
  function formatNumberWithCommas(num: number): string {
    return num.toLocaleString('en-US');
  }

  // Helper to fit nickname font size
  function fitNicknameFont(ctx: any, nickname: string, maxWidth: number, baseFont: string = 'bold 24px Arial', minFontSize: number = 16): string {
    let fontSize = 20;
    ctx.font = `bold ${fontSize}px Arial`;
    while (ctx.measureText(nickname).width > maxWidth && fontSize > minFontSize) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }
    return ctx.font;
  }

  // Canvas size
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Draw background image using absolute path
  const backgroundPath = path.join(__dirname, '../../assets/stats_bg.jpg');
  try {
    // const backgroundImg = await loadImage(backgroundPath);
    // console.log('Background image loaded ', backgroundPath);
    // ctx.drawImage(backgroundImg, 0, 0, width, height);
    // // Add opacity overlay (e.g., 0.5 for 50% opacity)
    // ctx.save();
    // ctx.globalAlpha = 0.8;
    // ctx.fillStyle = '#000';
    // ctx.fillRect(0, 0, width, height);
    // ctx.restore();
    ctx.fillStyle = '#161c2a';
    ctx.fillRect(0, 0, width, height);
  } catch (e) {
    // If image not found, fallback to solid color
    console.log('Background image error ', e);
    ctx.fillStyle = '#161c2a';
    ctx.fillRect(0, 0, width, height);
  }

  drawTopInfoBar(ctx, width, data.duration);

  // Layout/stat variables
  const statLabels = ['TOTAL SOULS', 'KILLS', 'DEATHS', 'ASSISTS', 'PLAYER DMG', 'OBJ DMG', 'HEALING'];
  const statKeys = ['souls', 'kills', 'deaths', 'assists', 'playerDmg', 'objDmg', 'healing'] as const;
  const numStats = statLabels.length;
  const numPlayersA = data.teamA.players.length;
  const numPlayersB = data.teamB.players.length;
  const playerGap = 15;
  const colWidth = (width - playerGap * (numPlayersA + numPlayersB - 1)) / (numPlayersA + numPlayersB) - 30;
  const cellHeight = 60;
  const heroSize = 110;
  const tableTop = 320;
  const gap = 30;
  const leftStart = gap;
  const rightStart = width - gap - numPlayersB * colWidth - (numPlayersB - 1) * playerGap;
  const allPlayers = [...data.teamA.players, ...data.teamB.players];
  const topValues: { [key in typeof statKeys[number]]: number } = {
    souls: 0, kills: 0, deaths: 0, assists: 0, playerDmg: 0, objDmg: 0, healing: 0
  };
  for (const key of statKeys) {
    topValues[key] = Math.max(...allPlayers.map(p => p[key] as number));
  }

  // Team A stats bars
  await drawTeamStatsBar(
    ctx,
    40, // x
    160, // y
    700, // width
    data.teamA,
    data.teamA.players.reduce((sum, p) => sum + p.kills, 0),
    data.teamA.totalSouls,
    data.teamA.players.reduce((sum, p) => sum + p.playerDmg, 0),
    data.teamA.victory,
    data.teamA.rankIconPath
  );

  // Team B stats bars
  await drawTeamStatsBar(
    ctx,
    width - 740, // x
    160, // y
    700, // width
    data.teamB,
    data.teamB.players.reduce((sum, p) => sum + p.kills, 0),
    data.teamB.totalSouls,
    data.teamB.players.reduce((sum, p) => sum + p.playerDmg, 0),
    data.teamB.victory,
    data.teamB.rankIconPath
  );

  // Draw stat labels centered
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#c2c2c2';
  ctx.textAlign = 'center';
  for (let i = 0; i < numStats; i++) {
    ctx.fillText(statLabels[i], width / 2, (tableTop + heroSize + 28) + (i + 1) * cellHeight);
  }

  // Draw team A columns
  for (let i = 0; i < numPlayersA; i++) {
    const p = data.teamA.players[i];
    const x = leftStart + i * (colWidth + playerGap);

    // Hero image (preserve aspect ratio)
    if (p.heroImage) {
      const heroImg = await loadImage(p.heroImage);
      const imgW = heroImg.width;
      const imgH = heroImg.height;
      let drawW = heroSize, drawH = heroSize;
      const aspect = imgW / imgH;
      if (aspect > 1) {
        // Wider than tall
        drawW = heroSize;
        drawH = heroSize / aspect;
      } else {
        // Taller than wide or square
        drawH = heroSize;
        drawW = heroSize * aspect;
      }
      const drawX = x + (colWidth - drawW) / 2;
      const drawY = tableTop + (heroSize - drawH) / 2;
      ctx.drawImage(heroImg, drawX, drawY, drawW, drawH);
    }

    // Nickname
    ctx.font = fitNicknameFont(ctx, p.nickname, colWidth);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.nickname, x + colWidth / 2, tableTop + heroSize + 24);

    // Stat cells
    for (let s = 0; s < statKeys.length; s++) {
      const key = statKeys[s];
      const value = p[key] as number;
      // Move table lower: add extra offset after nickname
      const tableOffset = 38;
      const y = tableTop + heroSize + tableOffset + (s + 1) * cellHeight;
        // Gradient highlight for topValue (except deaths)
        const isEvenRow = s % 2 === 0;
        let cellColor;
        const gradientColors: { [key: string]: string } = {
          souls: '#97f5ce',
          kills: '#d24f54',
          assists: '#7b2c97',
          playerDmg: '#2b60ca',
          objDmg: '#be943e',
          healing: '#96cd1d'
        };

        cellColor = isEvenRow ? '#283562' : '#1f2b51';
        ctx.fillStyle = cellColor;
        ctx.fillRect(x, y - cellHeight + 8, colWidth, cellHeight);

        if (value === topValues[key] && key !== 'deaths') {
          // Create right-to-left gradient
          const grad = ctx.createLinearGradient(x + colWidth, 0, x, 0);
          grad.addColorStop(0, gradientColors[key] || '#fff');
          grad.addColorStop(1, (gradientColors[key] || '#fff') + '00'); // transparent
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x, y - cellHeight + 8, colWidth, cellHeight);
          ctx.globalAlpha = 1.0;
        }
      // Value
      ctx.font = value === topValues[key] ? 'bold 24px Arial' : '24px Arial';
      ctx.fillStyle = value === topValues[key] ? '#fff' : '#c2c2c2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatNumberWithCommas(value), x + colWidth / 2, y - (cellHeight / 2) + 8);
    }
  }

  // Draw team B columns
  for (let i = 0; i < numPlayersB; i++) {
    const p = data.teamB.players[i];
  const x = rightStart + i * (colWidth + playerGap);

    // Hero image (preserve aspect ratio)
    if (p.heroImage) {
      const heroImg = await loadImage(p.heroImage);
      const imgW = heroImg.width;
      const imgH = heroImg.height;
      let drawW = heroSize, drawH = heroSize;
      const aspect = imgW / imgH;
      if (aspect > 1) {
        drawW = heroSize;
        drawH = heroSize / aspect;
      } else {
        drawH = heroSize;
        drawW = heroSize * aspect;
      }
      const drawX = x + (colWidth - drawW) / 2;
      const drawY = tableTop + (heroSize - drawH) / 2;
      ctx.drawImage(heroImg, drawX, drawY, drawW, drawH);
    }

  // Nickname
  ctx.font = fitNicknameFont(ctx, p.nickname, colWidth);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.nickname, x + colWidth / 2, tableTop + heroSize + 24);

    // Stat cells
    for (let s = 0; s < statKeys.length; s++) {
      const key = statKeys[s];
      const value = p[key] as number;
      // Move table lower: add extra offset after nickname
      const tableOffset = 38;
      const y = tableTop + heroSize + tableOffset + (s + 1) * cellHeight;
        // Gradient highlight for topValue (except deaths)
        const isEvenRow = s % 2 === 0;
        let cellColor;
        const gradientColors: { [key: string]: string } = {
          souls: '#97f5ce',
          kills: '#d24f54',
          assists: '#7b2c97',
          playerDmg: '#2b60ca',
          objDmg: '#be943e',
          healing: '#96cd1d'
        };

        cellColor = isEvenRow ? '#4c3d1f' : '#3f331b';
        ctx.fillStyle = cellColor;
        ctx.fillRect(x, y - cellHeight + 8, colWidth, cellHeight);

        if (value === topValues[key] && key !== 'deaths') {
          // Create right-to-left gradient
          const grad = ctx.createLinearGradient(x + colWidth, 0, x, 0);
          grad.addColorStop(0, gradientColors[key] || '#fff');
          grad.addColorStop(1, (gradientColors[key] || '#fff') + '00'); // transparent
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x, y - cellHeight + 8, colWidth, cellHeight);
          ctx.globalAlpha = 1.0;
        }
  // ...no cell border...
      // Value
      ctx.font = value === topValues[key] ? 'bold 28px Arial' : '24px Arial';
      ctx.fillStyle = value === topValues[key] ? '#fff' : '#c2c2c2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatNumberWithCommas(value), x + colWidth / 2, y - (cellHeight / 2) + 8);
    }
  }

  // Return image buffer
  return canvas.toBuffer('image/png');
}
