// process.env.NEXT_PUBLIC_* must be accessed as a static literal member
// expression (not process.env[name]) so Next.js can inline it into the
// browser bundle at build time — a dynamic lookup silently resolves to
// undefined on the client since process.env doesn't actually exist there
// outside the specific values the bundler replaced.
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Add it to .env.local (see .env.local.example) and restart the dev server.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  },
  get supabaseAnonKey() {
    return required(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  },
  get supabaseServiceRoleKey() {
    return required(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  },
};
