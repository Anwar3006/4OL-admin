"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section id={`policy-${title.split(".")[0]}`} className="scroll-mt-8 space-y-3 border-t border-slate-100 pt-8 first:border-t-0 first:pt-0 dark:border-slate-800">
    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
      {title}
    </h2>
    <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-200 space-y-3">
      {children}
    </div>
  </section>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-2">
    {items.map((item) => (
      <li
        key={item}
        className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed"
      >
        {item}
      </li>
    ))}
  </ul>
);

const PrivacyPolicyContent = () => {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-950/10 sm:px-10 sm:py-12">
        <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300">Legal & privacy</Badge>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-black tracking-tight">Privacy policy</h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              A clear guide to the information 4 Our Life collects, why we use it, and the choices available to you.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck className="size-5 text-emerald-400" />
            <span>Last updated: 26 September 2026</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
            In this policy
          </div>
          <nav aria-label="Privacy policy sections" className="grid gap-1 text-sm">
            {[
              ["1", "Introduction"],
              ["3", "Information we collect"],
              ["5", "How we use information"],
              ["6", "Sharing and disclosure"],
              ["9", "Your rights"],
              ["16", "Contact us"],
            ].map(([number, label]) => (
              <a key={number} href={`#policy-${number}`} className="rounded-lg px-2 py-1.5 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300">
                {label}
              </a>
            ))}
          </nav>
          <Button asChild variant="outline" size="sm" className="mt-5 w-full">
            <Link href="/support">Contact support <ArrowUpRight /></Link>
          </Button>
        </aside>

        <Card className="bg-white dark:bg-slate-900">
        <CardContent className="space-y-8 p-6 sm:p-8 lg:p-10">

        <Section title="1. Introduction">
          <p>
            4 Our Life ("4 Our Life," "we," "us," or "our") is committed to
            protecting your privacy and ensuring the security of your personal
            information, particularly your health data. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our mobile application, website, and
            services (collectively, the "App"). This Privacy Policy complies
            with the Data Protection Act, 2012 (Act 843) of Ghana and other
            applicable laws. By accessing or using our App, you acknowledge that
            you have read and understood this Privacy Policy.
          </p>
        </Section>

        <Section title="2. Data Controller Information">
          <p>
            4 Our Life Limited serves as the data controller for personal
            information collected through our App:
          </p>
          <div className="text-sm space-y-1">
            <p>4 Our Life (4th Pay Ltd)</p>
            <p>Kwashieman Ofankor Road, Accra, Ghana</p>
            <p>Email: disrupt@4th-pay.com</p>
            <p>Phone: +233 554 506861</p>
          </div>
        </Section>

        <Section title="3. Information We Collect">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            3.1 Personal Information
          </h4>
          <BulletList
            items={[
              "Identity Information: Full name, date of birth, gender",
              "Contact Information: Mobile phone number, email address, physical address",
              "Account Information: Username, password (encrypted)",
              "Device Information: Device type, operating system, unique device identifiers, IP address, mobile network information",
              "Location Information: Precise location data (with your consent) to help you find nearby healthcare facilities",
              "Usage Information: How you use our App, including features accessed, time spent, and actions taken",
            ]}
          />

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            3.2 Health Information
          </h4>
          <BulletList
            items={[
              "Health Profile: Optional health details you provide",
              "Reproductive Health: Menstrual cycle dates, ovulation information, pregnancy status (for period tracking)",
              "Medication Information: Medication names, dosages, schedules (for reminders)",
              "Symptoms and Conditions: Self-reported symptoms, conditions, and health concerns",
              "Healthcare Facility Interactions: Facilities you search for, save, or rate",
            ]}
          />

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            3.3 Information Collection Methods
          </h4>
          <BulletList
            items={[
              "Direct provision when you register and use our features",
              "Interactions with our App",
              "Automated technologies and cookies",
              "Third-party sources such as healthcare facility databases",
              "Public sources as permitted by law",
            ]}
          />
        </Section>

        <Section title="4. Legal Basis for Processing">
          <BulletList
            items={[
              "Performance of Contract",
              "Legal Obligation",
              "Legitimate Interests",
              "Consent (including for sensitive health data)",
              "Vital Interests",
            ]}
          />
        </Section>

        <Section title="5. How We Use Your Information">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            5.1 Providing and Improving the App
          </h4>
          <BulletList
            items={[
              "Create and maintain your account",
              "Provide features and personalize experiences",
              "Improve and develop the App",
              "Respond to support requests",
              "Send service-related communications",
            ]}
          />

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            5.2 Health-Related Features
          </h4>
          <BulletList
            items={[
              "Provide period and ovulation tracking",
              "Send medication reminders",
              "Offer health tips and education",
              "Help locate healthcare facilities",
              "Provide information about diseases and symptoms",
            ]}
          />

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            5.3 Research and Analytics
          </h4>
          <BulletList
            items={[
              "Public health research",
              "Understanding health trends",
              "Improving healthcare access",
              "Academic collaborations",
              "Statistical reporting",
            ]}
          />

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            5.4 Marketing
          </h4>
          <BulletList
            items={[
              "Send newsletters and health information",
              "Inform you about new features or services",
              "Invite you to surveys or research",
              "Provide relevant health content",
              "You can opt out at any time",
            ]}
          />
        </Section>

        <Section title="6. Information Sharing and Disclosure">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            6.1 Third-Party Service Providers
          </h4>
          <p>
            We share information with providers supporting cloud storage,
            analytics, customer support, health resources, and map services.
            They are contractually bound to comply with data protection laws.
          </p>

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            6.2 Healthcare Partners
          </h4>
          <p>
            With your consent we may share information with designated
            providers, facilities, or researchers (in de-identified form).
          </p>

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            6.3 Legal Requirements
          </h4>
          <p>
            We may disclose information when required by law, including to the
            Ghana Health Service, Data Protection Commission, law enforcement,
            or courts.
          </p>

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            6.4 Business Transfers
          </h4>
          <p>
            If we undergo a merger or acquisition, your information may transfer
            as part of the transaction, and we will notify you.
          </p>

          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            6.5 With Your Consent
          </h4>
          <p>
            We will share data with other third parties only when you give
            consent.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            7.1 Retention Periods
          </h4>
          <BulletList
            items={[
              "Account information: duration of account plus 2 years",
              "Health data: duration of account plus 3 years (or regulatory requirement)",
              "Communication records: 2 years",
              "Marketing preferences: until you opt out",
            ]}
          />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            7.2 Data Deletion
          </h4>
          <p>
            When retention ends we delete or anonymize data. You may request
            deletion subject to legal requirements.
          </p>
        </Section>

        <Section title="8. Data Security">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            8.1 Security Measures
          </h4>
          <BulletList
            items={[
              "Encryption of data in transit and at rest",
              "Multi-factor authentication",
              "Security assessments and penetration testing",
              "Access controls and authentication",
              "Staff training",
              "Incident response procedures",
            ]}
          />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            8.2 Health Data Security
          </h4>
          <BulletList
            items={[
              "Enhanced encryption standards",
              "Stricter access controls",
              "Regular security audits",
              "Compliance with health data standards",
              "Specialized staff training",
            ]}
          />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            8.3 Data Breach Procedures
          </h4>
          <BulletList
            items={[
              "Notify the Data Protection Commission within 72 hours",
              "Notify affected users without undue delay",
              "Provide breach information and guidance",
              "Mitigate potential harm",
            ]}
          />
        </Section>

        <Section title="9. Your Data Protection Rights">
          <BulletList
            items={[
              "Right to Access",
              "Right to Rectification",
              "Right to Erasure",
              "Right to Restrict Processing",
              "Right to Data Portability",
              "Right to Object",
              "Right to Withdraw Consent",
            ]}
          />
          <p>
            Contact disrupt@4th-pay.com to exercise these rights. We respond
            within 30 days.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            10.1 Age Restrictions
          </h4>
          <p>We do not knowingly collect data from children under 13.</p>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white pt-4">
            10.2 Parental Consent
          </h4>
          <p>
            Users aged 13–18 require parental consent. Guardians can review,
            delete, or restrict their child’s data. Contact us if you believe we
            collected information from a child under 13.
          </p>
        </Section>

        <Section title="11. International Data Transfers">
          <p>
            Data is primarily stored in Ghana but may be transferred elsewhere
            with safeguards such as contractual clauses, adequate protection
            assurances, or your consent.
          </p>
        </Section>

        <Section title="12. Cookies and Tracking Technologies">
          <p>We use cookies to operate and improve the App.</p>
          <BulletList
            items={[
              "Essential Cookies",
              "Analytical Cookies",
              "Functional Cookies",
              "Targeting Cookies (with consent)",
            ]}
          />
          <p>
            You can manage cookies in browser/device settings, but disabling
            some may affect functionality.
          </p>
        </Section>

        <Section title="13. Marketing Communications">
          <p>We send marketing communications only with consent.</p>
          <p>
            You can opt out via unsubscribe links, account settings, or by
            emailing disrupt@4th-pay.com.
          </p>
        </Section>

        <Section title="14. Changes to This Privacy Policy">
          <p>
            We may update this policy. Changes will be posted here with an
            updated "Last Updated" date and additional notice when required.
            Continued use indicates acceptance.
          </p>
        </Section>

        <Section title="15. Data Protection Complaints">
          <p>
            Contact us first at disrupt@4th-pay.com. You may also contact the
            Data Protection Commission, No. 6 Airport Road, Accra, Ghana (Email:
            info@dataprotection.org.gh | Phone: +233 30 295 7282).
          </p>
        </Section>

        <Section title="16. Contact Us">
          <div className="text-sm space-y-1">
            <p>4th Pay Ltd.</p>
            <p>Kwashieman Ofankor Road, Accra, Ghana</p>
            <p>Email: disrupt@4th-pay.com</p>
            <p>Phone: +233 554 506861</p>
          </div>
        </Section>
      </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyContent;
