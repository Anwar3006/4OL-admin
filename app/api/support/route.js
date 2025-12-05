// import { NextResponse } from "next/server";
// import nodemailer from "nodemailer";

// export async function POST(req) {
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
//       { error: "Failed to send email", details: error.message },
//       { status: 500 }
//     );
//   }
// }
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";

// Validate Resend API Key
if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not configured in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
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

    // Validate Resend API Key
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Email service not configured. Please set RESEND_API_KEY in environment variables.",
          details: "RESEND_API_KEY is required to send emails"
        },
        { status: 500 }
      );
    }

    // Team email - explicitly set to life@4ourlife.com
    const teamEmail = process.env.SUPPORT_TEAM_EMAIL || "life@4ourlife.com";

    // Debug logging
    console.log("SUPPORT_TEAM_EMAIL from env:", process.env.SUPPORT_TEAM_EMAIL);
    console.log("Sending email to:", teamEmail);
    console.log("Resend API Key configured:", !!process.env.RESEND_API_KEY);

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

    // Get the "from" email - use environment variable or default to Resend test domain
    // NOTE: When using onboarding@resend.dev, you can only send to verified email addresses
    // For production, you should verify your own domain in Resend and use an email from that domain
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Support Team <onboarding@resend.dev>";

    console.log("Sending email from:", fromEmail);
    console.log("Sending email to:", teamEmail);

    // Send using Resend
    const result = await resend.emails.send({
      from: fromEmail,
      to: teamEmail,
      reply_to: email,
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

    console.log("Resend API Response:", result);

    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend Error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // Provide more specific error messages
    let errorMessage = "Failed to send email";
    let errorDetails = error.message;

    // Check for common Resend errors
    if (error.message?.includes("API key")) {
      errorMessage = "Invalid or missing Resend API key";
      errorDetails = "Please check your RESEND_API_KEY environment variable";
    } else if (error.message?.includes("domain") || error.message?.includes("verify")) {
      errorMessage = "Domain verification required";
      errorDetails = "The email domain needs to be verified in Resend. When using onboarding@resend.dev, you can only send to verified email addresses.";
    } else if (error.message?.includes("rate limit") || error.message?.includes("quota")) {
      errorMessage = "Email sending rate limit exceeded";
      errorDetails = "Please try again later or upgrade your Resend plan";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        fullError: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
