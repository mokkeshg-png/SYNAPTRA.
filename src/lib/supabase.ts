/** Supabase client seam. Wired when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. */
export function supabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export const supabase = null as unknown as {
  auth: unknown;
} | null;
