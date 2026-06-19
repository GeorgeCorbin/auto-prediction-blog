import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with The Matchup Report team — advertising inquiries, editorial feedback, or general questions.',
};

const CONTACT_ITEMS = [
  {
    label: 'General Inquiries',
    email: 'hello@thematchupreport.com',
    description: 'Questions about our content, methodology, or the site in general.',
  },
  {
    label: 'Advertising & Partnerships',
    email: 'advertise@thematchupreport.com',
    description:
      'Interested in reaching our audience? We offer display advertising and sponsored content opportunities.',
  },
  {
    label: 'Editorial Feedback',
    email: 'editorial@thematchupreport.com',
    description: 'Spotted an error or want to suggest a game we should cover? Let us know.',
  },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
        {/* Page heading */}
        <div className="mb-10 border-b-2 border-[#E5E7EB] pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-[#FF6B2C] rounded-sm shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF6B2C]">
              Contact
            </span>
          </div>
          <h1 className="font-serif text-[36px] sm:text-[44px] font-bold text-[#1A1A1A] leading-[1.15]">
            Get in Touch
          </h1>
          <p className="mt-4 text-[15px] text-[#4B5563] leading-relaxed">
            We&apos;d love to hear from you. Reach out using one of the addresses below and
            we&apos;ll get back to you within one business day.
          </p>
        </div>

        {/* Contact cards */}
        <div className="space-y-5">
          {CONTACT_ITEMS.map(({ label, email, description }) => (
            <div
              key={email}
              className="border border-[#E5E7EB] rounded p-6 hover:border-[#FF6B2C] transition-colors"
            >
              <h2 className="font-sans text-[13px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A] mb-1">
                {label}
              </h2>
              <a
                href={`mailto:${email}`}
                className="text-[#FF6B2C] text-[15px] font-semibold hover:underline"
              >
                {email}
              </a>
              <p className="mt-2 text-[14px] text-[#6B7280] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer note */}
        <p className="mt-10 text-[12px] text-[#9CA3AF] leading-relaxed border-t border-[#E5E7EB] pt-6">
          Please note: We do not accept unsolicited pick submissions or tipster partnerships.
          All predictions on The Matchup Report are produced independently by our editorial system.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
