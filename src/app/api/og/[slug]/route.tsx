import { ImageResponse } from 'next/og';
import { getMatchupAssets } from '@/lib/images/matchup-data';
import { SplitMatchupLayout } from '@/lib/images/matchup-layouts';

export const runtime = 'nodejs';

const W = 1200;
const H = 675; // 16:9

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const assets = await getMatchupAssets(slug);
  if (!assets) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    <SplitMatchupLayout assets={assets} width={W} height={H} />,
    {
      width: W,
      height: H,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },
  );
}
