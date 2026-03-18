import { NextResponse } from "next/server";
import { getSupabaseAdminOrThrow } from "@/app/lib/authServer";
import {
  isValidEmail,
  normalizeEmail,
  toAuthMessage,
  validatePassword,
} from "@/app/lib/authShared";
import { consumeRateLimit, getClientIp } from "@/app/lib/requestRuntime";

const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const rateLimit = consumeRateLimit(
    `auth-signup:${getClientIp(req)}`,
    SIGNUP_LIMIT,
    SIGNUP_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    const email = normalizeEmail(String(body?.email || ""));
    const password = String(body?.password || "");

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminOrThrow();
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: "user",
      },
    });

    if (error) {
      const status = error.message.toLowerCase().includes("already") ? 409 : 400;
      return NextResponse.json(
        { error: toAuthMessage(error, "Unable to create account.") },
        { status },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: toAuthMessage(error, "Unable to create account.") },
      { status: 500 },
    );
  }
}
