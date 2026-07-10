import { z } from "zod";

function normalizeUrl(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  let s = String(val).trim().replace(/^["']|["']$/g, "");
  if (!s) return undefined;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/+$/, "");
}

const url = (defaultValue: string) =>
  z.preprocess(normalizeUrl, z.string().url().default(defaultValue));

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    DEEPSEEK_BASE_URL: url("https://api.deepseek.com"),
    APP_URL: url("http://localhost:3000"),
    CLIENT_URL: url("http://localhost:5173"),
    COOKIE_SECURE: z
      .string()
      .optional()
      .transform((v) => v === "true" || v === "1"),
  })
  .transform((data) => {
    // In production, default CLIENT_URL to APP_URL when not explicitly set
    if (
      data.NODE_ENV === "production" &&
      data.CLIENT_URL === "http://localhost:5173" &&
      data.APP_URL !== "http://localhost:3000"
    ) {
      return { ...data, CLIENT_URL: data.APP_URL };
    }
    return data;
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error("Environment validation failed:\n" + msg);
    console.error("\nAPP_URL and CLIENT_URL must be full URLs, e.g.:");
    console.error("  APP_URL=https://episteme-app-cuvbyo-179e3d-147-93-87-98.traefik.me");
    console.error("  CLIENT_URL=https://episteme-app-cuvbyo-179e3d-147-93-87-98.traefik.me");
    process.exit(1);
  }
  cached = result.data;
  return cached;
}

export function isProduction() {
  return getEnv().NODE_ENV === "production";
}

export function cookieSecure(): boolean {
  const env = getEnv();
  if (env.COOKIE_SECURE) return true;
  return env.NODE_ENV === "production";
}

export function googleAuthConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
