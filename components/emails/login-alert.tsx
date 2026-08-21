import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface LoginAlertEmailProps {
  email: string;
  device: string;
  ip: string;
  countdownSeconds: number;
}

/**
 * Sent the moment a concurrent super-admin login is detected — at the same
 * time the countdown modal pops up on the admin's other devices.
 */
export const LoginAlertEmail = ({
  email,
  device,
  ip,
  countdownSeconds,
}: LoginAlertEmailProps) => {
  const previewText =
    "Security alert: another device just signed in to your admin account";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#f3f4f6] py-10 font-sans">
          <Container className="mx-auto max-w-[600px] bg-white shadow-sm border border-[#e5e7eb] rounded-lg overflow-hidden">
            <Section className="bg-[#b91c1c] p-8">
              <Row>
                <Column align="center">
                  <Img
                    src="https://rhbbxttxnvcziyqzptqs.supabase.co/storage/v1/object/public/bucket4ol/logo.png"
                    width="60"
                    height="60"
                    alt="4 Our Life Logo"
                    style={{ marginBottom: "16px", borderRadius: "12px" }}
                  />
                  <Text className="m-0 font-bold tracking-[3px] text-[11px] uppercase text-white/90">
                    Security Alert
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section className="px-10 py-12">
              <Heading className="m-0 text-[24px] font-bold text-[#111827] leading-[30px]">
                New sign-in to your <br />
                <span style={{ color: "#b91c1c" }}>super admin account.</span>
              </Heading>

              <Text className="mt-8 text-[16px] leading-[26px] text-[#4b5563]">
                Another device just signed in to the 4 Our Life admin panel
                using your credentials while you already had an active
                session.
              </Text>

              <Section className="mt-6 rounded-md border border-[#fecaca] bg-[#fef2f2] p-5">
                <Text className="m-0 text-[14px] text-[#7f1d1d]">
                  <strong>Device:</strong> {device}
                </Text>
                <Text className="m-0 mt-2 text-[14px] text-[#7f1d1d]">
                  <strong>IP address:</strong> {ip || "Unknown"}
                </Text>
              </Section>

              <Text className="mt-6 text-[15px] leading-[24px] text-[#4b5563]">
                A countdown alert is live in your admin dashboard right now.
                Within {countdownSeconds} seconds you can{" "}
                <strong>sign the other device out</strong> or{" "}
                <strong>acknowledge the sign-in</strong>. If the timer runs
                out, the other device stays signed in.
              </Text>

              <Text className="mt-4 text-[15px] leading-[24px] text-[#4b5563]">
                If this was not you, open the dashboard immediately, sign the
                other device out, and change your password.
              </Text>

              <Hr className="my-8 border-[#eeeeee]" />

              <Text className="text-[12px] italic text-[#9ca3af] leading-[18px]">
                This alert was generated for <strong>{email}</strong>. If you
                believe your account is compromised, contact the platform team
                right away.
              </Text>
            </Section>

            <Section className="bg-[#f9fafb] px-10 py-8 border-t border-[#f1f1f1]">
              <Row>
                <Column align="center">
                  <Text className="m-0 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
                    © {new Date().getFullYear()} 4 Our Life
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#9ca3af]">
                    Precision • Security • Vitality
                  </Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default LoginAlertEmail;
