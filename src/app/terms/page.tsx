import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the Terms of Service for The Matchup Report.',
};

const EFFECTIVE_DATE = 'June 18, 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="font-serif text-[20px] font-bold text-[#1A1A1A] mt-10 mb-3">{title}</h2>
      <div className="space-y-4 text-[15px] text-[#4B5563] leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-[14px] font-bold text-[#1A1A1A] mb-1">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-1.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-[#FF6B2C] bg-[#FEF3EE] px-4 py-3 text-[14px] text-[#92400E] leading-relaxed">
      {children}
    </div>
  );
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
        {/* Heading */}
        <div className="mb-10 border-b-2 border-[#E5E7EB] pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-[#FF6B2C] rounded-sm shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF6B2C]">
              Legal
            </span>
          </div>
          <h1 className="font-serif text-[36px] sm:text-[44px] font-bold text-[#1A1A1A] leading-[1.15]">
            Terms of Service
          </h1>
          <p className="mt-3 text-[13px] text-[#9CA3AF]">
            Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last Updated: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* Age warning */}
        <Warning>
          <strong>21+ ONLY.</strong> The Matchup Report contains sports betting predictions,
          odds analysis, and gambling-related content. This content is intended exclusively for
          adults aged 21 or older (or of legal gambling age in their jurisdiction, whichever is
          higher). By continuing to use this Site you confirm that you meet this age requirement.
        </Warning>

        {/* Intro */}
        <p className="text-[15px] text-[#4B5563] leading-relaxed mt-6 mb-2">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
          website located at{' '}
          <strong className="text-[#1A1A1A]">thematchupreport.com</strong> and any associated
          pages, content, services, or features (collectively, the &ldquo;Site&rdquo;), operated
          by The Matchup Report (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
          Please read these Terms carefully before using the Site.
        </p>
        <p className="text-[15px] text-[#4B5563] leading-relaxed mb-2">
          <strong className="text-[#1A1A1A]">
            By accessing or using the Site, you agree to be bound by these Terms and our{' '}
            <a href="/privacy-policy" className="text-[#FF6B2C] hover:underline">
              Privacy Policy
            </a>
            , which is incorporated herein by reference.
          </strong>{' '}
          If you do not agree to all of these Terms, you must immediately stop using the Site.
        </p>

        {/* Table of Contents */}
        <nav className="my-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A] mb-3">
            Contents
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-[13px] text-[#FF6B2C]">
            {[
              ['#acceptance', 'Acceptance of Terms'],
              ['#eligibility', 'Eligibility and Age Requirement'],
              ['#nature', 'Nature of Content — Entertainment and Educational Only'],
              ['#no-guarantee', 'No Guarantee of Accuracy, Results, or Profit'],
              ['#gambling-law', 'Gambling Laws and Jurisdictional Compliance'],
              ['#responsible', 'Responsible Gambling'],
              ['#ip', 'Intellectual Property'],
              ['#prohibited', 'Prohibited Uses'],
              ['#third-party', 'Third-Party Links and Content'],
              ['#advertising-terms', 'Advertising'],
              ['#disclaimer', 'Disclaimer of Warranties'],
              ['#liability', 'Limitation of Liability'],
              ['#indemnification', 'Indemnification'],
              ['#dmca', 'Digital Millennium Copyright Act (DMCA)'],
              ['#privacy', 'Privacy'],
              ['#modifications', 'Modifications to Terms and Site'],
              ['#termination', 'Termination'],
              ['#governing', 'Governing Law and Dispute Resolution'],
              ['#class-action', 'Class Action Waiver'],
              ['#severability', 'Severability and Entire Agreement'],
              ['#contact-terms', 'Contact'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1 */}
        <Section id="acceptance" title="1. Acceptance of Terms">
          <p>
            By visiting, browsing, or otherwise accessing any part of the Site, you acknowledge
            that you have read, understood, and agree to be bound by these Terms and all
            applicable laws and regulations. These Terms apply to all visitors, users, and others
            who access or use the Site.
          </p>
          <p>
            If you are using the Site on behalf of an organization, you represent and warrant
            that you have authority to bind that organization to these Terms, and &ldquo;you&rdquo;
            refers to both you and the organization.
          </p>
        </Section>

        {/* 2 */}
        <Section id="eligibility" title="2. Eligibility and Age Requirement">
          <Warning>
            <strong>You must be at least 21 years of age</strong> to access or use the Site. The
            minimum legal age to engage with gambling-related content may be higher depending on
            your jurisdiction. You are solely responsible for determining and complying with the
            age restrictions applicable where you live.
          </Warning>
          <p>
            By using the Site you represent and warrant that: (a) you are at least 21 years of
            age or the legal gambling age in your jurisdiction, whichever is higher; (b) you have
            the legal capacity to enter into these Terms; and (c) your use of the Site does not
            violate any applicable law or regulation.
          </p>
          <p>
            We reserve the right to terminate your access to the Site at any time if we have
            reason to believe you do not meet the eligibility requirements.
          </p>
        </Section>

        {/* 3 */}
        <Section id="nature" title="3. Nature of Content — Entertainment and Educational Only">
          <p>
            All content published on The Matchup Report — including but not limited to game
            previews, picks, predictions, odds analysis, betting trends, injury reports, and any
            other editorial material — is provided{' '}
            <strong className="text-[#1A1A1A]">
              for entertainment and educational purposes only
            </strong>
            . It does not constitute professional sports betting advice, financial advice,
            investment advice, or any other form of professional advisory service.
          </p>
          <p>
            Our content is generated through a combination of automated data analysis, artificial
            intelligence, and editorial review. It reflects the opinions of our editorial system
            at the time of publication and should not be relied upon as a definitive or expert
            assessment of any sporting event.
          </p>
          <p>
            The Matchup Report is not a licensed sports betting operator, bookmaker, exchange,
            or gambling service provider. We do not accept wagers, hold funds, or facilitate
            any form of gambling transaction. Nothing on this Site should be construed as an
            invitation or inducement to gamble.
          </p>
        </Section>

        {/* 4 */}
        <Section id="no-guarantee" title="4. No Guarantee of Accuracy, Results, or Profit">
          <Warning>
            <strong>All picks and predictions are suggestions only.</strong> They are not
            guarantees of success or profit. Sports betting involves substantial risk of financial
            loss. You may lose some or all money wagered.
          </Warning>
          <p>
            We make no representation or warranty of any kind — express, implied, or statutory —
            as to the accuracy, completeness, timeliness, or fitness for a particular purpose of
            any prediction, pick, odds line, statistic, or other data published on the Site.
          </p>
          <p>
            Past performance of any picks published on this Site is not indicative of future
            results. Sporting outcomes are inherently unpredictable, and even statistically
            sound analysis can and does result in incorrect predictions.
          </p>
          <p>
            You acknowledge and agree that: (a) you are solely responsible for any decision to
            place a wager; (b) you will conduct your own independent analysis before wagering;
            (c) we are not liable for any financial loss arising from your reliance on our content.
          </p>
        </Section>

        {/* 5 */}
        <Section id="gambling-law" title="5. Gambling Laws and Jurisdictional Compliance">
          <p>
            Online sports betting and gambling are subject to a complex and rapidly changing
            patchwork of federal, state, provincial, and local laws. The legality of sports
            betting varies significantly by jurisdiction. It is your sole responsibility to
            determine whether accessing sports betting content and placing wagers is legal in your
            jurisdiction before doing so.
          </p>
          <p>
            The Site is operated from the United States and is intended for use by persons in
            jurisdictions where accessing such content is lawful. We make no representation that
            the Site or its content is appropriate or available for use in all locations. Persons
            who access the Site from jurisdictions where such content is illegal do so on their
            own initiative and are solely responsible for compliance with local laws.
          </p>
          <Ul
            items={[
              'If you are located in a jurisdiction where sports betting is illegal, you must immediately discontinue use of the Site.',
              'If you are located in a U.S. state where online sports betting is not yet legalized, any information on the Site is provided for informational purposes only and should not be used to facilitate illegal wagering.',
              'We reserve the right to restrict access to the Site from specific geographic regions at our discretion.',
            ]}
          />
        </Section>

        {/* 6 */}
        <Section id="responsible" title="6. Responsible Gambling">
          <p>
            We are committed to promoting responsible gambling. We encourage all users to:
          </p>
          <Ul
            items={[
              'Set strict budgets for gambling activity and never wager more than you can afford to lose.',
              'Never chase losses with larger or more frequent bets.',
              'Take regular breaks from gambling and do not let it interfere with personal, professional, or financial obligations.',
              'Be aware of the signs of problem gambling: preoccupation with betting, increasing wager sizes to achieve the same excitement, lying about gambling activity, borrowing money to gamble.',
              'Use self-exclusion tools offered by licensed sportsbooks if you feel your gambling is becoming problematic.',
            ]}
          />
          <p>
            If you or someone you know has a gambling problem, free and confidential help is
            available:
          </p>
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded p-4 space-y-2 text-[14px]">
            <p>
              <strong className="text-[#1A1A1A]">National Problem Gambling Helpline:</strong>{' '}
              <a href="tel:18004264253" className="text-[#FF6B2C] hover:underline font-semibold">
                1-800-GAMBLER (1-800-426-2537)
              </a>{' '}
              — call or text, 24/7
            </p>
            <p>
              <strong className="text-[#1A1A1A]">National Council on Problem Gambling:</strong>{' '}
              <a
                href="https://www.ncpgambling.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                ncpgambling.org
              </a>
            </p>
            <p>
              <strong className="text-[#1A1A1A]">Gamblers Anonymous:</strong>{' '}
              <a
                href="https://www.gamblersanonymous.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                gamblersanonymous.org
              </a>
            </p>
          </div>
        </Section>

        {/* 7 */}
        <Section id="ip" title="7. Intellectual Property">
          <SubSection title="7.1 Our Content">
            <p>
              All content on the Site — including text, graphics, logos, images, article copy,
              data compilations, and the overall look and feel — is the exclusive property of The
              Matchup Report or its licensors and is protected by United States and international
              copyright, trademark, trade dress, and other intellectual property laws.
            </p>
          </SubSection>
          <SubSection title="7.2 Limited License">
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable license to
              access and view the Site and its content for personal, non-commercial use only.
              This license does not include: (a) any resale or commercial use of the Site or its
              content; (b) any downloading or copying of information for the benefit of another
              person or entity; (c) any use of data mining, robots, scrapers, or similar data
              gathering tools; or (d) any systematic retrieval of content to create a collection,
              compilation, database, or directory.
            </p>
          </SubSection>
          <SubSection title="7.3 Trademarks">
            <p>
              &ldquo;The Matchup Report&rdquo; and associated logos are trademarks of The Matchup
              Report. You may not use our trademarks without prior written permission. All other
              trademarks referenced on the Site are the property of their respective owners.
            </p>
          </SubSection>
          <SubSection title="7.4 User-Submitted Content">
            <p>
              If you submit any content to us (e.g., via email), you grant us a worldwide,
              royalty-free, perpetual, irrevocable, non-exclusive license to use, reproduce,
              modify, publish, and distribute such content for any purpose. You represent that
              you own or have the necessary rights to grant this license.
            </p>
          </SubSection>
        </Section>

        {/* 8 */}
        <Section id="prohibited" title="8. Prohibited Uses">
          <p>You agree not to:</p>
          <Ul
            items={[
              'Use the Site for any unlawful purpose or in violation of any applicable laws or regulations, including gambling laws in your jurisdiction.',
              'Access or attempt to access the Site using automated means, bots, scrapers, crawlers, or similar technologies without our prior written consent.',
              'Reproduce, duplicate, copy, sell, resell, or otherwise exploit any portion of the Site or its content for commercial purposes without express written permission from us.',
              'Attempt to reverse-engineer, decompile, disassemble, or otherwise derive the source code of any software underlying the Site.',
              'Introduce any viruses, Trojan horses, worms, or other malicious code to the Site.',
              'Attempt to gain unauthorized access to any part of the Site or its related systems or networks.',
              'Impersonate or misrepresent your affiliation with any person or entity.',
              'Transmit unsolicited commercial messages (spam) through or in connection with the Site.',
              'Engage in any activity that disrupts, interferes with, or imposes an unreasonable burden on our infrastructure.',
              'Use the Site to facilitate illegal gambling or to launder proceeds from illegal activity.',
              'Share, republish, or redistribute our picks or predictions as your own or through any paid advisory service without a written licensing agreement.',
            ]}
          />
        </Section>

        {/* 9 */}
        <Section id="third-party" title="9. Third-Party Links and Content">
          <p>
            The Site may contain links to third-party websites, including online sportsbooks,
            sports data providers, and news sources. These links are provided solely for
            convenience and do not constitute an endorsement, sponsorship, or recommendation by
            The Matchup Report of the linked site or any products, services, or content offered
            there.
          </p>
          <p>
            We have no control over third-party websites and are not responsible for their
            content, privacy practices, or terms of service. Your use of any linked third-party
            website is at your own risk and governed by the terms and policies of that site.
            We strongly encourage you to review the terms and privacy policies of any third-party
            website before registering an account, depositing funds, or placing a wager.
          </p>
        </Section>

        {/* 10 */}
        <Section id="advertising-terms" title="10. Advertising">
          <p>
            The Site displays third-party advertisements served by Google AdSense and potentially
            other advertising networks. The inclusion of any advertisement does not constitute an
            endorsement, guarantee, or recommendation of the advertised product or service by The
            Matchup Report.
          </p>
          <p>
            Sportsbook and gambling operator advertisements may appear on the Site. These
            advertisements are subject to the terms and responsible gambling policies of the
            respective operators. We are not responsible for the terms, conditions, or practices
            of any advertiser, and any transaction between you and an advertiser is solely between
            you and that advertiser.
          </p>
          <p>
            Gambling operator advertisements are served only in jurisdictions where such
            advertising is permitted by law. If you are located in a jurisdiction where online
            sports betting advertising is prohibited, you should not interact with such
            advertisements.
          </p>
        </Section>

        {/* 11 */}
        <Section id="disclaimer" title="11. Disclaimer of Warranties">
          <p className="uppercase font-semibold text-[#1A1A1A] text-[13px]">
            The site and all content, information, services, and materials contained therein are
            provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any
            kind, express or implied.
          </p>
          <p>
            To the fullest extent permitted by applicable law, The Matchup Report expressly
            disclaims all warranties, including but not limited to:
          </p>
          <Ul
            items={[
              'Implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
              'Warranties that the Site will be available on an uninterrupted, timely, secure, or error-free basis.',
              'Warranties as to the accuracy, reliability, completeness, or timeliness of any content, including predictions, odds, statistics, or injury data.',
              'Warranties that any defects or errors will be corrected.',
              'Warranties that the Site is free of viruses or other harmful components.',
            ]}
          />
          <p>
            Your use of the Site and reliance on any content is at your sole risk. Some
            jurisdictions do not allow the exclusion of implied warranties, so some of the above
            exclusions may not apply to you.
          </p>
        </Section>

        {/* 12 */}
        <Section id="liability" title="12. Limitation of Liability">
          <p className="uppercase font-semibold text-[#1A1A1A] text-[13px]">
            To the maximum extent permitted by applicable law, The Matchup Report, its owners,
            officers, directors, employees, contractors, agents, licensors, and suppliers shall
            not be liable for any indirect, incidental, special, consequential, punitive, or
            exemplary damages.
          </p>
          <p>This limitation includes but is not limited to damages for:</p>
          <Ul
            items={[
              'Loss of money, revenue, profits, or anticipated savings resulting from reliance on any prediction, pick, or odds analysis published on the Site.',
              'Loss of data or goodwill.',
              'Unauthorized access to or alteration of your data.',
              'Conduct of any third party on the Site or in connection with the Site.',
              'Any other matter arising out of or related to your use of the Site.',
            ]}
          />
          <p>
            This limitation of liability applies regardless of the legal theory asserted
            (including contract, tort, negligence, strict liability, or otherwise) and even if
            The Matchup Report has been advised of the possibility of such damages.
          </p>
          <p>
            In jurisdictions where limitation of liability for consequential or incidental damages
            is not permitted, our liability is limited to the greatest extent permitted by law.
            In no event shall our aggregate liability to you for all claims arising from or
            related to the Site exceed one hundred U.S. dollars ($100.00).
          </p>
        </Section>

        {/* 13 */}
        <Section id="indemnification" title="13. Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless The Matchup Report and its owners,
            officers, directors, employees, contractors, agents, licensors, and suppliers from
            and against any and all claims, liabilities, damages, losses, costs, and expenses
            (including reasonable attorneys&rsquo; fees) arising out of or in any way connected
            with:
          </p>
          <Ul
            items={[
              'Your access to or use of the Site.',
              'Your violation of these Terms.',
              'Your violation of any applicable law or regulation, including gambling laws.',
              'Your infringement of any intellectual property or other rights of any third party.',
              'Any content you submit to us.',
            ]}
          />
          <p>
            We reserve the right, at our own expense, to assume the exclusive defense and control
            of any matter otherwise subject to indemnification by you, in which event you will
            cooperate with us in asserting any available defenses.
          </p>
        </Section>

        {/* 14 */}
        <Section id="dmca" title="14. Digital Millennium Copyright Act (DMCA)">
          <p>
            If you believe that any content on the Site infringes a copyright you own or control,
            please send a written notice to us containing the following information:
          </p>
          <Ul
            items={[
              'A physical or electronic signature of the copyright owner or authorized agent.',
              'Identification of the copyrighted work claimed to be infringed.',
              'Identification of the material claimed to be infringing, with sufficient detail to enable us to locate it on the Site.',
              'Your contact information (name, address, telephone number, and email address).',
              'A statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.',
              'A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on behalf of the copyright owner.',
            ]}
          />
          <p>
            Send DMCA notices to:{' '}
            <a href="mailto:hello@thematchupreport.com" className="text-[#FF6B2C] hover:underline">
              hello@thematchupreport.com
            </a>{' '}
            with the subject line &ldquo;DMCA Notice.&rdquo;
          </p>
        </Section>

        {/* 15 */}
        <Section id="privacy" title="15. Privacy">
          <p>
            Your use of the Site is also governed by our{' '}
            <a href="/privacy-policy" className="text-[#FF6B2C] hover:underline">
              Privacy Policy
            </a>
            , which is incorporated into these Terms by reference. By using the Site you consent
            to the practices described in the Privacy Policy.
          </p>
        </Section>

        {/* 16 */}
        <Section id="modifications" title="16. Modifications to Terms and Site">
          <p>
            We reserve the right to modify these Terms at any time at our sole discretion. When
            we make material changes, we will post the updated Terms on this page and update the
            &ldquo;Effective Date.&rdquo; Your continued use of the Site after changes are posted
            constitutes your acceptance of the modified Terms.
          </p>
          <p>
            We also reserve the right to modify, suspend, or discontinue any part of the Site —
            including any content, feature, or service — at any time, without notice and without
            liability to you.
          </p>
        </Section>

        {/* 17 */}
        <Section id="termination" title="17. Termination">
          <p>
            We may, in our sole discretion, terminate or suspend your access to the Site
            immediately and without notice for any reason, including your breach of these Terms.
            Upon termination, your license to use the Site immediately ceases.
          </p>
          <p>
            Provisions of these Terms that by their nature should survive termination shall
            survive, including but not limited to intellectual property provisions, warranty
            disclaimers, indemnification, and limitations of liability.
          </p>
        </Section>

        {/* 18 */}
        <Section id="governing" title="18. Governing Law and Dispute Resolution">
          <SubSection title="18.1 Governing Law">
            <p>
              These Terms and any dispute arising out of or related to them or the Site shall be
              governed by and construed in accordance with the laws of the United States and the
              State of Delaware, without regard to its conflict of law principles.
            </p>
          </SubSection>
          <SubSection title="18.2 Binding Arbitration">
            <p>
              Except for disputes that qualify for small claims court, any dispute, controversy,
              or claim arising out of or relating to these Terms or the Site (&ldquo;Dispute&rdquo;)
              shall be resolved exclusively by binding individual arbitration administered by the
              American Arbitration Association (&ldquo;AAA&rdquo;) under its Consumer Arbitration
              Rules, which are available at{' '}
              <a
                href="https://www.adr.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                adr.org
              </a>
              .
            </p>
            <p>
              The arbitration shall be conducted in English and, unless you and we agree
              otherwise, shall take place in the county in which you reside. The arbitrator shall
              have authority to award any remedy or relief available under applicable law.
              Judgment on the arbitration award may be entered in any court with jurisdiction.
            </p>
          </SubSection>
          <SubSection title="18.3 Opt-Out of Arbitration">
            <p>
              You may opt out of the arbitration agreement within 30 days of first accepting these
              Terms by emailing us at{' '}
              <a href="mailto:hello@thematchupreport.com" className="text-[#FF6B2C] hover:underline">
                hello@thematchupreport.com
              </a>{' '}
              with the subject line &ldquo;Arbitration Opt-Out,&rdquo; including your full name
              and a statement that you wish to opt out. If you opt out, any disputes will be
              resolved in the courts described below.
            </p>
          </SubSection>
          <SubSection title="18.4 Litigation">
            <p>
              If arbitration does not apply or you have opted out, you agree that any litigation
              shall be instituted exclusively in the federal or state courts located in Delaware,
              and you consent to the personal jurisdiction of those courts.
            </p>
          </SubSection>
        </Section>

        {/* 19 */}
        <Section id="class-action" title="19. Class Action Waiver">
          <p className="uppercase font-semibold text-[#1A1A1A] text-[13px]">
            To the fullest extent permitted by law, you and The Matchup Report each waive the
            right to bring or participate in a class action lawsuit, class-wide arbitration, or
            any other representative proceeding against the other.
          </p>
          <p>
            All claims must be brought in the parties&rsquo; individual capacity and not as a
            plaintiff or class member in any purported class or representative proceeding. The
            arbitrator may not consolidate more than one person&rsquo;s claims and may not
            preside over any form of class or representative proceeding.
          </p>
        </Section>

        {/* 20 */}
        <Section id="severability" title="20. Severability and Entire Agreement">
          <p>
            If any provision of these Terms is found to be unenforceable or invalid by a court
            of competent jurisdiction, that provision will be limited or eliminated to the minimum
            extent necessary, and the remaining provisions will remain in full force and effect.
          </p>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between
            you and The Matchup Report regarding the Site and supersede all prior and
            contemporaneous agreements, representations, and understandings, whether written or
            oral, relating to the Site.
          </p>
          <p>
            Our failure to enforce any right or provision of these Terms shall not constitute a
            waiver of that right or provision.
          </p>
        </Section>

        {/* 21 */}
        <Section id="contact-terms" title="21. Contact">
          <p>If you have any questions about these Terms, please contact us:</p>
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded p-5 space-y-1 text-[14px]">
            <p className="font-semibold text-[#1A1A1A]">The Matchup Report</p>
            <p>
              Email:{' '}
              <a href="mailto:hello@thematchupreport.com" className="text-[#FF6B2C] hover:underline">
                hello@thematchupreport.com
              </a>
            </p>
            <p>Website: thematchupreport.com</p>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
