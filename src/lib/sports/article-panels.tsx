import type { Game } from '@prisma/client';
import { MlbArticlePanels } from '@/lib/sports/mlb/article-panels';
import { WorldCupArticlePanels } from '@/lib/sports/world-cup/article-panels';

export function SportArticlePanels({ game }: { game: Game }) {
  switch (game.sport) {
    case 'mlb':
      return <MlbArticlePanels game={game} />;
    case 'world-cup':
      return <WorldCupArticlePanels game={game} />;
    default:
      return null;
  }
}
