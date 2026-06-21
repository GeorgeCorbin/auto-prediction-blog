import cron from 'node-cron';
import { scanGames } from './scan-games';
import { generateArticles } from './generate-articles';

console.log('Scheduler started.');
console.log('  scan-games:        every hour (ESPN only)');
console.log('  generate-articles: every 30 minutes (odds + AI at publish time)');

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

// Every 30 minutes: generate articles for READY games
cron.schedule('*/30 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running generate-articles...`);
  generateArticles().catch(console.error);
});
