import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isEmailConfigured,
  missingEmailConfig,
  sendEmail,
} from "@/lib/email";
// import nodemailer from "nodemailer";

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { name, email, message } = body;

//     // Validate required fields
//     if (!name || !email || !message) {
//       return NextResponse.json(
//         { error: "All fields are required" },
//         { status: 400 }
//       );
//     }

//     // Get email configuration from environment variables
//     const teamEmail = process.env.SUPPORT_TEAM_EMAIL || "alidaniyalweb702@gmail.com";

//     // Get SMTP configuration from environment variables
//     const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
//     const smtpPort = parseInt(process.env.SMTP_PORT || "587");
//     const smtpSecure = process.env.SMTP_SECURE === "true";
//     const emailUser = process.env.EMAIL_USER || "alidaniyalweb702@gmail.com";
//     const emailPassword = process.env.EMAIL_PASSWORD;

//     if (!emailPassword) {
//       console.error("EMAIL_PASSWORD not configured");
//       return NextResponse.json(
//         { error: "Email service not configured. Please set EMAIL_PASSWORD in environment variables." },
//         { status: 500 }
//       );
//     }

//     // Create transporter
//     const transporter = nodemailer.createTransport({
//       host: smtpHost,
//       port: smtpPort,
//       secure: smtpSecure, // true for 465, false for other ports
//       auth: {
//         user: emailUser,
//         pass: emailPassword,
//       },
//     });

//     // Email content
//     const mailOptions = {
//       from: `"Support Form" <${emailUser}>`,
//       to: teamEmail,
//       replyTo: email,
//       subject: `New Support Request from ${name}`,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2 style="color: #56ce84;">New Support Request</h2>
//           <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
//             <p><strong>Name:</strong> ${name}</p>
//             <p><strong>Email:</strong> ${email}</p>
//             <p><strong>Message:</strong></p>
//             <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-radius: 3px; margin-top: 10px;">
//               ${message.replace(/\n/g, "<br>")}
//             </p>
//           </div>
//           <p style="color: #666; font-size: 12px;">
//             This message was sent from the support form on your website.
//           </p>
//         </div>
//       `,
//       text: `
//         New Support Request

//         Name: ${name}
//         Email: ${email}

//         Message:
//         ${message}
//       `,
//     };

//     // Send email
//     await transporter.sendMail(mailOptions);

//     return NextResponse.json(
//       { message: "Email sent successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error sending email:", error);
//     return NextResponse.json(
//       { error: "Failed to send email", details: (error instanceof Error ? error.message : String(error)) },
//       { status: 500 }
//     );
//   }
// }
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!isEmailConfigured()) {
      const missing = missingEmailConfig();
      console.error("[support] email is not configured:", missing.join(", "));
      return NextResponse.json(
        {
          error: "Email service is not configured.",
          details: `Set ${missing.join(" and ")}.`,
        },
        { status: 500 }
      );
    }

    // Team email - explicitly set to life@4ourlife.com
    const teamEmail = process.env.SUPPORT_TEAM_EMAIL || "life@4ourlife.com";

    // Validate team email
    if (!teamEmail || !teamEmail.includes("@")) {
      return NextResponse.json(
        { error: "Invalid team email configuration" },
        { status: 500 }
      );
    }

    // Build the HTML email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #56ce84;">New Support Request</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-radius: 3px; margin-top: 10px;">
            ${message.replace(/\n/g, "<br>")}
          </p>
        </div>
        <p style="color: #666; font-size: 12px;">
          This message was sent from the support form on your website.
        </p>
      </div>
    `;

    const result = await sendEmail({
      to: teamEmail,
      // `replyTo`, not `reply_to`. Resend's typed client rejects the snake_case
      // key, so this field was silently dropped for as long as the file was
      // .jsx and unchecked — support replies went to the from-address instead
      // of the person who wrote in. Surfaced by the E5.1 conversion.
      replyTo: email,
      subject: `New Support Request from ${name}`,
      html: htmlContent,
      text: `
New Support Request

Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Support email error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // Provide more specific error messages
    let errorMessage = "Failed to send email";
    let errorDetails = (error instanceof Error ? error.message : String(error));

    // Check for common Resend errors
    if ((error instanceof Error ? error.message : String(error))?.includes("API key")) {
      errorMessage = "Invalid or missing Resend API key";
      errorDetails = "Please check your RESEND_API_KEY environment variable";
    } else if ((error instanceof Error ? error.message : String(error))?.includes("domain") || (error instanceof Error ? error.message : String(error))?.includes("verify")) {
      errorMessage = "Domain verification required";
      errorDetails = "The email domain needs to be verified in Resend. When using onboarding@resend.dev, you can only send to verified email addresses.";
    } else if ((error instanceof Error ? error.message : String(error))?.includes("rate limit") || (error instanceof Error ? error.message : String(error))?.includes("quota")) {
      errorMessage = "Email sending rate limit exceeded";
      errorDetails = "Please try again later or upgrade your Resend plan";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        fullError: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
