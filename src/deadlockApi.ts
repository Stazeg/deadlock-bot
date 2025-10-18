// Deadlock ranks API types
export interface DeadlockRankImages {
  large: string;
  large_webp: string;
  large_subrank1: string;
  large_subrank1_webp: string;
  large_subrank2: string;
  large_subrank2_webp: string;
  large_subrank3: string;
  large_subrank3_webp: string;
  large_subrank4: string;
  large_subrank4_webp: string;
  large_subrank5: string;
  large_subrank5_webp: string;
  large_subrank6: string;
  large_subrank6_webp: string;
  small: string;
  small_webp: string;
  small_subrank1: string;
  small_subrank1_webp: string;
  small_subrank2: string;
  small_subrank2_webp: string;
  small_subrank3: string;
  small_subrank3_webp: string;
  small_subrank4: string;
  small_subrank4_webp: string;
  small_subrank5: string;
  small_subrank5_webp: string;
  small_subrank6: string;
  small_subrank6_webp: string;
}

export interface DeadlockRank {
  tier: number;
  name: string;
  images: DeadlockRankImages;
  color: string;
}
// Types for Deadlock match metadata API response
export interface DeadlockMatchMetadataPlayer {
  account_id: number;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  team: string; // "Team0" or "Team1"
  net_worth: number;
  stats: DeadlockPlayerStats[];
}

export type DeadlockPlayerStats = {
  player_damage: number;
  boss_damage: number;
  player_healing: number;
  // ...other fields as needed
};

export interface DeadlockMatchMetadata {
  match_id: number;
  duration_s: number;
  winning_team: string;
  players: DeadlockMatchMetadataPlayer[];
  average_badge_team0: number;
  average_badge_team1: number;
  // ...other fields as needed
}

// Fetch Deadlock match metadata
export async function getMatchMetadata(matchId: number): Promise<DeadlockMatchMetadata> {
  const url = `https://api.deadlock-api.com/v1/matches/metadata?include_player_info=true&include_player_stats=true&match_ids=${matchId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch match metadata: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) throw new Error('Invalid match metadata response');
  return data[0];
}
export async function getSteamProfile(steamId: string): Promise<{ nickname: string, avatar: string }> {
  const url = `https://api.deadlock-api.com/v1/players/steam?account_ids=${steamId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'deadlock-bot/1.0',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Steam profile API request failed: ${response.status}`);
  }
    const arr = await response.json();
    const data = Array.isArray(arr) && arr.length > 0 ? arr[0] : {};
  return {
    nickname: data.personaname || `Steam User ${steamId}`,
    avatar: data.avatarfull || ''
  };
}

export async function getRanksData(language: string = 'english'): Promise<DeadlockRank[]> {
  const url = `https://assets.deadlock-api.com/v2/ranks?language=${language}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'deadlock-bot/1.0',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Ranks API request failed: ${response.status}`);
  }
  return response.json();
}

export async function getHeroInfo(heroId: number): Promise<{ name: string, image: string }> {
  const url = `https://assets.deadlock-api.com/v2/heroes/${heroId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'deadlock-bot/1.0',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Hero API request failed: ${response.status}`);
  }
  const data = await response.json();
  return {
    name: data.name || `Hero ${heroId}`,
    image: data.images?.icon_hero_card_webp || ''
  };
}

export async function getMatchHistory(steamId: string): Promise<any[]> {
  const url = `https://api.deadlock-api.com/v1/players/${steamId}/match-history`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'deadlock-bot/1.0',
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.matches || []);
}

export async function getPlayerStats(steamId: string): Promise<any> {
  const url = `https://api.deadlock-api.com/v1/players/${steamId}/card`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}
