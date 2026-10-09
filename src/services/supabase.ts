import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Null when the app is built without Supabase settings; igo then works on this device only. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
