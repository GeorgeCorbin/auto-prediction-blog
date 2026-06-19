import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | The Matchup Report',
    default: 'The Matchup Report — Sports Predictions & Analysis',
  },
  description:
    'Expert MLB predictions, odds analysis, and game previews. Daily picks backed by stats, probable pitchers, and betting line value.',
};

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png?v=20260619" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=20260619" />
        <link rel="shortcut icon" href="/favicon.ico?v=20260619" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260619" />
        <link rel="manifest" href="/site.webmanifest?v=20260619" />
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {gaId ? (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#1A1A1A]">{children}</body>
    </html>
  );
}
