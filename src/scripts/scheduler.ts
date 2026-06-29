import cron from 'node-cron';
import { scanGames } from './scan-games';
import { generateArticles } from './generate-articles';
import {
  generatePowerRankings,
  generateWinTotals,
  generateMatchupCheatSheet,
  generateBettingTrends,
  generatePlayoffPicture,
  generateAwardRaces,
  generateTeamProfile,
} from './generate-evergreen';
import { getAllTeamIds } from '@/lib/evergreen/mlb-team-profiles';

console.log('Scheduler started.');
console.log('  scan-games:        every hour (ESPN; odds API throttled to 4h per sport)');
console.log('  generate-articles: every 15 minutes (uses stored odds lines)');
console.log('  power-rankings:       Mondays at 8am ET');
console.log('  matchup-cheat-sheet:  Mondays at 9am ET');
console.log('  win-totals:           1st and 15th of each month at 8am ET');
console.log('  betting-trends:       1st and 15th of each month at 9am ET');
console.log('  playoff-picture:      Mondays at 10am ET (Aug–Oct)  ');
console.log('  award-races:          1st and 15th of each month at 10am ET (May–Oct)');
console.log('  team-profiles:        Tue/Thu at 8am ET — 2 random teams per run');

// Run scan first, then generate — avoids racing on startup when no games are READY yet
scanGames()
  .catch(console.error)
  .finally(() => {
    generateArticles().catch(console.error);
  });

// Every hour: scan for new games + odds
cron.schedule('0 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running scan-games...`);
  scanGames().catch(console.error);
});

// Every 15 minutes: generate articles for READY games
cron.schedule('*/15 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running generate-articles...`);
  generateArticles().catch(console.error);
});

// Every Monday at 8am ET: generate MLB power rankings
cron.schedule('0 8 * * 1', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: power-rankings...`);
  const season = new Date().getFullYear();
  generatePowerRankings(season, false).catch(console.error);
}, { timezone: 'America/New_York' });

// 1st and 15th of each month at 8am ET: generate win-total tracker
cron.schedule('0 8 1,15 * *', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: win-totals...`);
  const season = new Date().getFullYear();
  generateWinTotals(season, false).catch(console.error);
}, { timezone: 'America/New_York' });

// Every Monday at 9am ET: matchup cheat sheet
cron.schedule('0 9 * * 1', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: matchup-cheat-sheet...`);
  const season = new Date().getFullYear();
  generateMatchupCheatSheet(season, false).catch(console.error);
}, { timezone: 'America/New_York' });

// 1st and 15th of each month at 9am ET: betting trends
cron.schedule('0 9 1,15 * *', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: betting-trends...`);
  const season = new Date().getFullYear();
  generateBettingTrends(season, false).catch(console.error);
}, { timezone: 'America/New_York' });

// Every Monday at 10am ET, Aug–Oct (months 8–10): playoff picture
cron.schedule('0 10 * 8-10 1', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: playoff-picture...`);
  const season = new Date().getFullYear();
  generatePlayoffPicture(season, false).catch(console.error);
}, { timezone: 'America/New_York' });

// 1st and 15th of each month at 10am ET, May–Oct (months 5–10): award races
cron.schedule('0 10 1,15 5-10 *', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: award-races...`);
  const season = new Date().getFullYear();
  generateAwardRaces(season, false).catch(console.error);
}, { timezone: 'America/New_York' });

// Tue and Thu at 8am ET, Apr–Aug (months 4–8): team profiles — 2 random teams per run
cron.schedule('0 8 * 4-8 2,4', () => {
  console.log(`[${new Date().toISOString()}] Running evergreen: team-profiles...`);
  const season = new Date().getFullYear();
  const ids = getAllTeamIds();
  const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, 2);
  Promise.all(shuffled.map((id) => generateTeamProfile(id, season, false))).catch(console.error);
}, { timezone: 'America/New_York' });
