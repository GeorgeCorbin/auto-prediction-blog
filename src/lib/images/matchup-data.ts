import { prisma } from '@/lib/db';
import { fetchLogoAsDataUrl, teamColor, teamLogoUrl } from '@/lib/images/team-colors';

export interface MatchupAssets {
  awayAbbr: string;
  homeAbbr: string;
  awayLogoSrc: string;
  homeLogoSrc: string;
  awayColor: string;
  homeColor: string;
}

export async function getMatchupAssets(slug: string): Promise<MatchupAssets | null> {
  let article;
  try {
    article = await prisma.article.findUnique({
      where: { slug },
      include: { game: true },
    });
  } catch {
    return null;
  }
  if (!article) return null;

  const { game } = article;
  const awayAbbr = game.awayTeamAbbr;
  const homeAbbr = game.homeTeamAbbr;

  const [awayLogoSrc, homeLogoSrc] = await Promise.all([
    fetchLogoAsDataUrl(teamLogoUrl(awayAbbr, game.sport)),
    fetchLogoAsDataUrl(teamLogoUrl(homeAbbr, game.sport)),
  ]);

  return {
    awayAbbr,
    homeAbbr,
    awayLogoSrc,
    homeLogoSrc,
    awayColor: teamColor(awayAbbr),
    homeColor: teamColor(homeAbbr),
  };
}
