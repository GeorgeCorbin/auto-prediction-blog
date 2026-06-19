import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read the Privacy Policy for The Matchup Report.',
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

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-[13px] text-[#9CA3AF]">
            Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last Updated: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* Intro */}
        <p className="text-[15px] text-[#4B5563] leading-relaxed mb-2">
          The Matchup Report (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates
          the website located at <strong className="text-[#1A1A1A]">thematchupreport.com</strong>{' '}
          (the &ldquo;Site&rdquo;). This Privacy Policy explains what information we collect, how
          we use and share it, your rights regarding that information, and how to contact us with
          questions or concerns. By accessing or using the Site you agree to this Privacy Policy.
          If you do not agree, please discontinue use of the Site immediately.
        </p>

        {/* Table of Contents */}
        <nav className="my-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A] mb-3">
            Contents
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-[13px] text-[#FF6B2C]">
            {[
              ['#collect', 'Information We Collect'],
              ['#use', 'How We Use Your Information'],
              ['#cookies', 'Cookies and Tracking Technologies'],
              ['#third-party', 'Third-Party Services and Disclosure'],
              ['#advertising', 'Advertising'],
              ['#retention', 'Data Retention'],
              ['#security', 'Data Security'],
              ['#children', "Children's Privacy and Age Restrictions"],
              ['#rights', 'Your Privacy Rights'],
              ['#ccpa', 'California Residents — CCPA / CPRA'],
              ['#gdpr', 'EEA, UK, and Swiss Residents — GDPR'],
              ['#dnsmpi', 'Do Not Sell or Share My Personal Information'],
              ['#changes', 'Changes to This Policy'],
              ['#contact', 'Contact Us'],
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
        <Section id="collect" title="1. Information We Collect">
          <p>
            We collect information in two ways: automatically when you visit the Site, and
            directly when you choose to contact us.
          </p>

          <SubSection title="1.1 Information Collected Automatically">
            <p>
              When you access any page on the Site, our servers and third-party analytics
              providers automatically record certain technical data, including:
            </p>
            <Ul
              items={[
                'Internet Protocol (IP) address and approximate geographic location (city / region / country)',
                'Browser type, version, and language settings',
                'Operating system and device type (desktop, mobile, tablet)',
                'Referring URL (the page you visited before arriving at the Site)',
                'Pages visited, time spent on each page, and navigation path through the Site',
                'Date and time of each request',
                'Clickstream data (links clicked, scroll depth)',
                'Screen resolution and viewport size',
              ]}
            />
            <p>
              This data is collected through server logs, cookies, pixel tags, and similar
              technologies described in Section 3.
            </p>
          </SubSection>

          <SubSection title="1.2 Information You Provide Directly">
            <p>
              The Site does not currently offer user accounts or registration. However, if you
              contact us via email or any contact form, we collect the information you voluntarily
              provide, which may include your name, email address, and the content of your message.
            </p>
          </SubSection>

          <SubSection title="1.3 Information from Third Parties">
            <p>
              We may receive aggregated or anonymised data from advertising partners and analytics
              vendors about how users interact with ads served on the Site. This data does not
              directly identify you to us and is used solely for ad performance measurement and
              Site improvement.
            </p>
          </SubSection>
        </Section>

        {/* 2 */}
        <Section id="use" title="2. How We Use Your Information">
          <p>We use the information described above for the following purposes:</p>
          <Ul
            items={[
              'Operating, maintaining, and improving the Site and its content',
              'Serving and measuring the performance of advertisements',
              'Analyzing aggregate traffic patterns and user behavior to understand how content is consumed',
              'Detecting and preventing fraud, abuse, spam, or other prohibited activity',
              'Complying with applicable laws, regulations, and legal processes',
              'Responding to your inquiries or communications',
              'Enforcing our Terms of Service and other agreements',
              'Protecting the rights, property, and safety of us, our users, and the public',
            ]}
          />
          <p>
            We do not sell, rent, or trade your personally identifiable information to third
            parties for their own marketing purposes, except as described in this Policy.
          </p>
        </Section>

        {/* 3 */}
        <Section id="cookies" title="3. Cookies and Tracking Technologies">
          <SubSection title="3.1 What Are Cookies">
            <p>
              Cookies are small text files placed on your device by a website when you visit it.
              They allow the website (or third-party services embedded on the website) to
              recognize your browser on return visits and to store certain preferences or
              behavioral data.
            </p>
          </SubSection>

          <SubSection title="3.2 Types of Cookies We Use">
            <p>
              <strong className="text-[#1A1A1A]">Strictly Necessary Cookies:</strong> Required for
              the Site to function correctly (e.g., security, load balancing). These cannot be
              disabled without impairing the Site.
            </p>
            <p>
              <strong className="text-[#1A1A1A]">Analytics Cookies:</strong> Used to understand
              how visitors interact with the Site in aggregate (pages viewed, session duration,
              bounce rate). We may use Google Analytics or similar services for this purpose.
            </p>
            <p>
              <strong className="text-[#1A1A1A]">Advertising Cookies:</strong> Placed by Google
              AdSense and other advertising technology partners to deliver personalized
              advertisements based on your browsing behavior across websites and to measure ad
              performance.
            </p>
            <p>
              <strong className="text-[#1A1A1A]">Functional / Preference Cookies:</strong> Store
              preferences such as region, language, or display settings to enhance your experience
              on return visits.
            </p>
          </SubSection>

          <SubSection title="3.3 Other Tracking Technologies">
            <p>
              In addition to cookies, we or our partners may use web beacons (pixel tags),
              JavaScript tags, local storage, and similar technologies to collect information
              about your interactions with the Site and with advertisements.
            </p>
          </SubSection>

          <SubSection title="3.4 Your Cookie Choices">
            <p>
              Most browsers allow you to refuse cookies or to alert you when cookies are being
              sent. Browser-level controls vary; consult your browser&rsquo;s help documentation
              for instructions. Please note that disabling advertising cookies will not eliminate
              advertising on the Site — it will make the ads less relevant to you.
            </p>
            <p>
              You may also opt out of interest-based advertising from Google by visiting{' '}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                adssettings.google.com
              </a>
              , or from participating Network Advertising Initiative members via{' '}
              <a
                href="https://optout.networkadvertising.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                optout.networkadvertising.org
              </a>
              .
            </p>
          </SubSection>
        </Section>

        {/* 4 */}
        <Section id="third-party" title="4. Third-Party Services and Disclosure">
          <SubSection title="4.1 Service Providers">
            <p>
              We share data with third-party vendors who perform services on our behalf, including
              web hosting, content delivery, analytics, and advertising. These providers are
              contractually restricted to using data only to perform the services we have
              requested.
            </p>
          </SubSection>

          <SubSection title="4.2 Advertising Partners">
            <p>
              The Site uses Google AdSense to display advertisements. Google and its partners may
              use cookies and other tracking technologies to show you ads based on your prior
              visits to this Site and other websites. Google&rsquo;s use of advertising cookies
              enables it and its partners to serve ads based on your visit to our Site and/or
              other sites on the Internet. For more information, see Google&rsquo;s{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                Privacy &amp; Terms
              </a>
              .
            </p>
          </SubSection>

          <SubSection title="4.3 Analytics Providers">
            <p>
              We use analytics services such as Google Analytics to understand how users engage
              with our content. Analytics data is aggregated and anonymised where possible. You
              can opt out of Google Analytics tracking by installing the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B2C] hover:underline"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </p>
          </SubSection>

          <SubSection title="4.4 Legal Disclosures">
            <p>
              We may disclose your information if required to do so by law or in the good-faith
              belief that such action is necessary to: (a) comply with a legal obligation or
              governmental request; (b) protect and defend our rights or property; (c) prevent or
              investigate possible wrongdoing in connection with the Site; (d) protect the personal
              safety of users of the Site or the public; or (e) protect against legal liability.
            </p>
          </SubSection>

          <SubSection title="4.5 Business Transfers">
            <p>
              If we are involved in a merger, acquisition, asset sale, financing, or other
              corporate transaction, your information may be transferred as part of that
              transaction. We will notify you via a prominent notice on the Site before your
              information is transferred and becomes subject to a different privacy policy.
            </p>
          </SubSection>
        </Section>

        {/* 5 */}
        <Section id="advertising" title="5. Advertising">
          <p>
            The Site is supported by third-party advertising. Ads served on the Site may be
            targeted based on your browsing history, inferred interests, demographic information,
            or other factors collected by advertising technology providers over time. This is
            commonly called &ldquo;interest-based&rdquo; or &ldquo;behavioral&rdquo; advertising.
          </p>
          <p>
            Because the Site covers sports betting topics, certain ad partners may infer
            interest in gambling-related content and serve relevant advertisements. We are not
            responsible for the content of third-party advertisements and do not endorse any
            products or services advertised.
          </p>
          <p>
            We comply with the{' '}
            <a
              href="https://www.iab.com/guidelines/iab-europe-transparency-consent-framework-policies/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6B2C] hover:underline"
            >
              IAB Transparency &amp; Consent Framework
            </a>{' '}
            and Google&rsquo;s publisher policies. Gambling and sports-betting advertisements are
            only served in jurisdictions where such advertising is legally permitted and where the
            user has not indicated they are under 21 years of age.
          </p>
        </Section>

        {/* 6 */}
        <Section id="retention" title="6. Data Retention">
          <p>
            We retain automatically collected log data (server logs, analytics events) for up to
            26 months, after which it is deleted or anonymised in aggregate form. Communications
            you send us (e.g., emails) are retained for as long as necessary to respond and to
            maintain our internal records, typically no longer than three (3) years unless a
            longer retention period is required by law.
          </p>
        </Section>

        {/* 7 */}
        <Section id="security" title="7. Data Security">
          <p>
            We implement industry-standard technical and organizational measures to protect the
            information we hold, including TLS/HTTPS encryption for data in transit, access
            controls limiting who within our organization can access data, and regular security
            reviews of our infrastructure.
          </p>
          <p>
            No method of transmission over the internet or method of electronic storage is 100%
            secure. We cannot guarantee absolute security and are not responsible for security
            breaches caused by factors outside our reasonable control, including actions of third
            parties or your own failure to protect access credentials.
          </p>
        </Section>

        {/* 8 */}
        <Section id="children" title="8. Children's Privacy and Age Restrictions">
          <p>
            <strong className="text-[#1A1A1A]">The Site is intended for adults aged 21 and older.</strong>{' '}
            Sports betting content — including predictions, odds analysis, and picks — is intended
            exclusively for individuals who are of legal gambling age in their jurisdiction
            (which is 21 or older in most U.S. states).
          </p>
          <p>
            The Site is not directed to children under the age of 13. We do not knowingly collect
            or solicit personal information from anyone under the age of 13. If you are under 13,
            do not use or provide any information on this Site. If we learn we have collected
            personal information from a child under 13, we will delete that information as quickly
            as possible. If you believe we may have information from or about a child under 13,
            please contact us at{' '}
            <a href="mailto:hello@thematchupreport.com" className="text-[#FF6B2C] hover:underline">
              hello@thematchupreport.com
            </a>
            .
          </p>
        </Section>

        {/* 9 */}
        <Section id="rights" title="9. Your Privacy Rights">
          <p>
            Depending on where you reside, you may have certain rights regarding your personal
            information. These may include the right to:
          </p>
          <Ul
            items={[
              'Access a copy of the personal information we hold about you',
              'Correct inaccurate or incomplete personal information',
              'Request deletion ("right to be forgotten") of your personal information',
              'Object to or restrict certain processing of your personal information',
              'Data portability — receive your personal information in a structured, commonly used, machine-readable format',
              'Withdraw consent at any time where processing is based on consent',
              'Lodge a complaint with your local data protection authority',
            ]}
          />
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:hello@thematchupreport.com" className="text-[#FF6B2C] hover:underline">
              hello@thematchupreport.com
            </a>
            . We will respond to verifiable requests within the timeframes required by applicable
            law (typically 30–45 days). We may need to verify your identity before processing
            your request.
          </p>
        </Section>

        {/* 10 */}
        <Section id="ccpa" title="10. California Residents — CCPA / CPRA">
          <p>
            If you are a California resident, the California Consumer Privacy Act (CCPA), as
            amended by the California Privacy Rights Act (CPRA), grants you the following
            additional rights:
          </p>
          <SubSection title="Categories of Personal Information Collected">
            <p>
              In the past 12 months we have collected the following categories as defined by the
              CCPA: Identifiers (IP address, cookie IDs); Internet or other electronic network
              activity information (browsing history on the Site, clickstream data); Geolocation
              data (approximate, derived from IP address); Inferences drawn from the above to
              create a profile about you for advertising purposes.
            </p>
          </SubSection>
          <SubSection title="Purposes of Collection">
            <p>
              Advertising, analytics, site operations, legal compliance. We do not use sensitive
              personal information for purposes beyond those permitted by the CPRA without your
              consent.
            </p>
          </SubSection>
          <SubSection title="Your California Rights">
            <Ul
              items={[
                'Right to Know: Request disclosure of the categories and specific pieces of personal information we have collected, sold, or shared about you.',
                'Right to Delete: Request deletion of personal information we have collected, subject to certain exceptions.',
                'Right to Correct: Request correction of inaccurate personal information.',
                'Right to Opt Out of Sale / Sharing: We do not sell personal information for monetary consideration. We do share personal information with advertising partners for cross-context behavioral advertising, which the CPRA treats as "sharing." See Section 12 to opt out.',
                'Right to Limit Use of Sensitive Personal Information: We do not collect sensitive personal information as defined by the CPRA beyond what is permitted.',
                'Right to Non-Discrimination: Exercising your privacy rights will not result in discriminatory treatment.',
              ]}
            />
          </SubSection>
          <p>
            To submit a CCPA/CPRA request, email us at{' '}
            <a href="mailto:hello@thematchupreport.com" className="text-[#FF6B2C] hover:underline">
              hello@thematchupreport.com
            </a>{' '}
            with the subject line &ldquo;California Privacy Request.&rdquo; We will respond
            within 45 calendar days and may extend by an additional 45 days with notice.
          </p>
        </Section>

        {/* 11 */}
        <Section id="gdpr" title="11. EEA, UK, and Swiss Residents — GDPR">
          <p>
            If you are located in the European Economic Area, the United Kingdom, or Switzerland,
            we process your personal data under the following legal bases:
          </p>
          <Ul
            items={[
              'Legitimate Interests: Operating and improving the Site, fraud prevention, and analytics (where your rights and freedoms do not override our legitimate interests).',
              'Consent: Serving personalized advertisements via cookies where we have obtained your consent.',
              'Legal Obligation: Complying with applicable laws and regulations.',
            ]}
          />
          <p>
            You have the right to lodge a complaint with your local supervisory authority. For EU
            residents, a list of national data protection authorities is available at{' '}
            <a
              href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6B2C] hover:underline"
            >
              edpb.europa.eu
            </a>
            . For UK residents, the relevant authority is the Information Commissioner&rsquo;s
            Office (ICO) at{' '}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6B2C] hover:underline"
            >
              ico.org.uk
            </a>
            .
          </p>
          <p>
            We transfer personal data outside the EEA/UK only where appropriate safeguards are in
            place (e.g., Standard Contractual Clauses, adequacy decisions). Our primary data
            processors are located in the United States.
          </p>
        </Section>

        {/* 12 */}
        <Section id="dnsmpi" title="12. Do Not Sell or Share My Personal Information">
          <p>
            We do not sell your personal information for monetary compensation. However, the
            sharing of cookie and device identifiers with advertising partners for cross-context
            behavioral advertising may constitute a &ldquo;sale&rdquo; or &ldquo;sharing&rdquo;
            under certain state privacy laws.
          </p>
          <p>To opt out of this sharing for advertising purposes, you may:</p>
          <Ul
            items={[
              'Use the Google Ad Settings tool at adssettings.google.com to manage your ad personalization preferences.',
              'Enable the Global Privacy Control (GPC) signal in a compatible browser. We honor GPC signals as an opt-out of sale/sharing under applicable state laws.',
              'Opt out via the Network Advertising Initiative opt-out page at optout.networkadvertising.org.',
              'Email us at hello@thematchupreport.com with the subject line "Opt Out of Sharing."',
            ]}
          />
        </Section>

        {/* 13 */}
        <Section id="changes" title="13. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our
            practices, technologies, legal requirements, or for other operational reasons. When we
            make material changes, we will post the revised Policy on this page and update the
            &ldquo;Effective Date&rdquo; at the top. We encourage you to review this Policy
            periodically. Your continued use of the Site after any changes constitutes your
            acceptance of the updated Policy.
          </p>
        </Section>

        {/* 14 */}
        <Section id="contact" title="14. Contact Us">
          <p>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
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
