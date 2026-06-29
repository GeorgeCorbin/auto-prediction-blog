# Generated Article Types & Post Frequency

Every article is stored in the `Article` table with an `articleType` field and rendered at `/[sport]/[slug]`.  
Evergreen articles hide odds tables, pitcher panels, and the Best Bet box; they use the `EvergreenContent` markdown renderer and an `EvergreenHero` quad-box image.

---

## 1. Game Prediction / Preview

- **`articleType`:** `game` (default)
- **Content:** Per-game preview with odds table, pitcher/player panels, Best Bet box, and AI-written analysis.
- **Data:** ESPN schedule · Odds API · MLB Stats API
- **Schedule:** Scan every hour; generate every 15 min (6am–11pm ET)
- **Key files:** `src/scripts/generate-articles.ts`, `src/lib/sports/mlb/`
- **CLI:** `npm run generate`

---

## 2. MLB Power Rankings

- **`articleType`:** `power-rankings`
- **Content:** All 30 teams ranked 1–30 by composite score (win %, last-10, streak, OPS, ERA, WHIP, R/G). Hero image uses a 2×2 quad-box of the top-4 teams' logos.
- **Data:** `fetchAllMlbStandings`, `fetchMlbLeagueLeaders`, `fetchMlbTeamStats`
- **Schedule:** Every Monday at 8:00am ET · All season
- **Key files:** `src/lib/evergreen/mlb-power-rankings.ts`
- **CLI:** `npm run evergreen:power-rankings [-- --force]`

---

## 3. MLB Win-Total Tracker

- **`articleType`:** `win-totals`
- **Content:** Each team's current pace projected over 162 games, compared against their preseason O/U line.
- **Data:** `fetchMlbStandingsForTeam` · `mlb-win-totals-config.json` (preseason lines)
- **Schedule:** 1st and 15th of every month at 8:00am ET · April–October
- **Key files:** `src/lib/evergreen/mlb-win-totals.ts`, `src/lib/evergreen/mlb-win-totals-config.json`
- **CLI:** `npm run evergreen:win-totals [-- --force]`

---

## 4. MLB Matchup Cheat Sheet

- **`articleType`:** `matchup-cheat-sheet`
- **Content:** Weekly preview of the 5 most compelling series. Each matchup gets a betting angle (fade, back, totals) based on OPS, ERA, last-10 form.
- **Data:** `fetchAllMlbStandings`, `fetchMlbTeamStats`, `fetchMlbLeagueLeaders`
- **Schedule:** Every Monday at 9:00am ET · All season
- **Key files:** `src/lib/evergreen/mlb-matchup-cheat-sheet.ts`
- **CLI:** `npm run evergreen:matchup-cheat-sheet [-- --force]`

---

## 5. MLB Betting Trends

- **`articleType`:** `betting-trends`
- **Content:** Bi-weekly situational betting report. Hot/cold teams by last-10, totals angles by OPS/ERA, situational spots (streak teams, division dogs).
- **Data:** `fetchAllMlbStandings`, `fetchMlbTeamStats`, `fetchMlbLeagueLeaders`
- **Schedule:** 1st and 15th of every month at 9:00am ET · All season
- **Key files:** `src/lib/evergreen/mlb-betting-trends.ts`
- **CLI:** `npm run evergreen:betting-trends [-- --force]`

---

## 6. MLB Team Profiles

- **`articleType`:** `team-profile`
- **Content:** Deep-dive season profile for one team — offense/pitching analysis, recent form, betting angles, injury impact, rest-of-season outlook.
- **Data:** `fetchMlbStandingsForTeam`, `fetchMlbTeamStats`, `fetchMlbTeamLeaders`, `fetchMlbInjuredPlayers`, `fetchMlbTeamRecentRecord`
- **Schedule:** Tuesday & Thursday at 8:00am ET · April–August (2 random teams per run)
- **Key files:** `src/lib/evergreen/mlb-team-profiles.ts`, `src/lib/evergreen/mlb-team-profiles-config.json`
- **CLI:** `npm run evergreen:team-profile [-- <teamId> --force]`

---

## 7. MLB Playoff Picture

- **`articleType`:** `playoff-picture`
- **Content:** Weekly division leader standings, wild card races, bubble watch, and bold predictions for the stretch run.
- **Data:** `fetchAllMlbStandings`, `fetchMlbTeamStats`, `fetchMlbLeagueLeaders`
- **Schedule:** Every Monday at 10:00am ET · August–October only
- **Key files:** `src/lib/evergreen/mlb-playoff-picture.ts`
- **CLI:** `npm run evergreen:playoff-picture [-- --force]`

---

## 8. MLB Award Races

- **`articleType`:** `award-races`
- **Content:** Bi-weekly tracker of MVP, Cy Young, and Rookie of the Year races — frontrunners and darkhorse candidates based on live leaderboard stats.
- **Data:** `fetchMlbLeagueLeaders` (BA, HR, RBI, OPS, ERA, K, W, WHIP — top 10)
- **Schedule:** 1st and 15th of every month at 10:00am ET · May–October
- **Key files:** `src/lib/evergreen/mlb-award-races.ts`
- **CLI:** `npm run evergreen:award-races [-- --force]`

---

## Scheduler Summary

All jobs run in `src/scripts/scheduler.ts`:

| Task | Frequency | Time | Months |
|------|-----------|------|--------|
| Scan games | Hourly | — | All |
| Generate game articles | Every 15 min | 6am–11pm ET | All |
| Power Rankings | Weekly (Mon) | 8:00am ET | All season |
| Win-Total Tracker | 1st & 15th | 8:00am ET | Apr–Oct |
| Matchup Cheat Sheet | Weekly (Mon) | 9:00am ET | All season |
| Betting Trends | 1st & 15th | 9:00am ET | All season |
| Team Profiles | Tue & Thu | 8:00am ET | Apr–Aug |
| Playoff Picture | Weekly (Mon) | 10:00am ET | Aug–Oct |
| Award Races | 1st & 15th | 10:00am ET | May–Oct |

## Manual Triggering

```bash
npm run generate                                      # game articles
npm run evergreen:power-rankings -- --force
npm run evergreen:win-totals -- --force
npm run evergreen:matchup-cheat-sheet -- --force
npm run evergreen:betting-trends -- --force
npm run evergreen:playoff-picture -- --force
npm run evergreen:award-races -- --force
npm run evergreen:team-profile                        # 2 random teams
npm run evergreen:team-profile -- 119 --force         # specific team (e.g. LAD = 119)
```
