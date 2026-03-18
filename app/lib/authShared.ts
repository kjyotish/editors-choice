const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PUBLIC_LOGIN_REDIRECT = "/inspiration";
export const ADMIN_LOGIN_REDIRECT = "/dashboard";
export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export function validatePassword(value: string) {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }

  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return null;
}

export function sanitizeRedirectPath(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
}

export function isAdminUser(user: unknown) {
  if (!user || typeof user !== "object") return false;
  const appMetadata = (user as { app_metadata?: { role?: unknown } }).app_metadata;
  return appMetadata?.role === "admin";
}

export function isAdminSession(session: unknown) {
  if (!session || typeof session !== "object") return false;
  return isAdminUser((session as { user?: unknown }).user);
}

export function toAuthMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  const message = raw.toLowerCase();

  if (!message) return fallback;
  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("email address") && message.includes("invalid")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("password should")) {
    return raw;
  }
  if (message.includes("email not confirmed")) {
    return "This account is not ready yet. Please contact support.";
  }
  if (message.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return raw || fallback;
}
