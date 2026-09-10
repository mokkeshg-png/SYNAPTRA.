import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

// Non-nullable — env vars are validated above; app will not start without them.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function supabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
