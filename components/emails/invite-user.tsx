import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteUserEmailProps {
  name: string;
  email: string;
  inviteLink: string;
}

export default function InviteUserEmail({ name, email, inviteLink }: InviteUserEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join 4 Our Life</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "Arial, sans-serif", padding: "40px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", margin: "0 auto", maxWidth: "600px", overflow: "hidden" }}>
          <Section style={{ backgroundColor: "#059669", padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, letterSpacing: "2px", margin: 0, textTransform: "uppercase" }}>
              4 Our Life
            </Text>
          </Section>
          <Section style={{ padding: "40px" }}>
            <Heading style={{ color: "#111827", fontSize: "28px", lineHeight: "34px", margin: "0 0 24px" }}>
              You’re invited
            </Heading>
            <Text style={{ color: "#4b5563", fontSize: "16px", lineHeight: "25px" }}>Hello {name},</Text>
            <Text style={{ color: "#4b5563", fontSize: "16px", lineHeight: "25px" }}>
              An administrator has invited you to create your 4 Our Life account. This invitation expires in seven days.
            </Text>
            <Section style={{ margin: "32px 0", textAlign: "center" }}>
              <Button href={inviteLink} style={{ backgroundColor: "#059669", borderRadius: "6px", color: "#ffffff", display: "inline-block", fontSize: "16px", fontWeight: 700, padding: "14px 24px", textDecoration: "none" }}>
                Accept invitation
              </Button>
            </Section>
            <Text style={{ color: "#6b7280", fontSize: "13px", lineHeight: "20px" }}>
              If the button does not work, copy and paste this link into your browser:<br />
              <Link href={inviteLink} style={{ color: "#047857" }}>{inviteLink}</Link>
            </Text>
            <Hr style={{ borderColor: "#e5e7eb", margin: "28px 0" }} />
            <Text style={{ color: "#9ca3af", fontSize: "12px", lineHeight: "18px" }}>
              This invitation was created for {email}. If you were not expecting it, you can ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
