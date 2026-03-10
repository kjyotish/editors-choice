import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Read a required environment variable safely.
function getEnv(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

// Send contact form submissions via SMTP.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    const website = String(body?.website || "").trim(); // honeypot

    if (website) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const smtpHost = getEnv("SMTP_HOST");
    const smtpPort = getEnv("SMTP_PORT");
    const smtpUser = getEnv("SMTP_USER");
    const smtpPass = getEnv("SMTP_PASS");
    const smtpTo = getEnv("SMTP_TO");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpTo) {
      return NextResponse.json({ ok: false, error: "Email service not configured." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const safeSubject = subject || "New Contact Form Message";
    const text = `Name: ${name}\nEmail: ${email}\nSubject: ${safeSubject}\n\n${message}`;

    await transporter.sendMail({
      from: `EditorsChoice <${smtpUser}>`,
      to: smtpTo,
      replyTo: email,
      subject: safeSubject,
      text,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to send message." }, { status: 500 });
  }
}
