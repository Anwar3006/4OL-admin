import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface InviteAdminEmailProps {
  email: string;
  inviteLink: string;
}

export const InviteAdminEmail = ({
  email,
  inviteLink,
}: InviteAdminEmailProps) => {
  const previewText = `Exclusive Invitation: Join the 4 Our Life Administrative Team`;
  const username = email?.split("@")[0] || "Admin";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#f3f4f6] py-10 font-sans">
          <Container className="mx-auto max-w-[600px] bg-white shadow-sm border border-[#e5e7eb] rounded-lg overflow-hidden">
            {/* Header: Solid Color Header using Row/Column for centering */}
            <Section className="bg-[#059669] p-8">
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
                    Health Administration Portal
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Content Body */}
            <Section className="px-10 py-12">
              <Heading className="m-0 text-[26px] font-bold text-[#111827] leading-[32px]">
                Elevating Healthcare <br />
                <span style={{ color: "#059669" }}>Management.</span>
              </Heading>

              <Text className="mt-8 text-[16px] leading-[26px] text-[#4b5563]">
                Hello <strong>{username}</strong>,
              </Text>

              <Text className="text-[16px] leading-[26px] text-[#4b5563]">
                You have been selected to join the elite network of 4 Our Life
                administrators. Your role involves managing world-class medical
                facilities and ensuring operational excellence.
              </Text>

              {/* Centered Bulletproof Button */}
              <Section align="center" className="mt-10 mb-10">
                <Button
                  className="bg-[#059669] px-8 py-4 rounded-md text-white text-[14px] font-bold no-underline text-center"
                  href={inviteLink}
                  style={{
                    display: "inline-block",
                    lineHeight: "100%",
                  }}
                >
                  Accept Administrative Access
                </Button>
              </Section>

              <Text className="text-[13px] text-[#6b7280] leading-[20px]">
                If the button above does not work, securely copy and paste this
                link:
                <br />
                <Link href={inviteLink} className="text-[#059669] underline">
                  {inviteLink}
                </Link>
              </Text>

              <Hr className="my-8 border-[#eeeeee]" />

              <Text className="text-[12px] italic text-[#9ca3af] leading-[18px]">
                This invitation was securely generated for{" "}
                <strong>{email}</strong>. Confidentiality and precision are the
                pillars of our infrastructure.
              </Text>
            </Section>

            {/* Minimalist Footer */}
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

export default InviteAdminEmail;
