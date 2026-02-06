import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useLocal = import.meta.env.VITE_USE_LOCAL_DB === 'true';

// Conditional export
import { mockSupabase } from './mockSupabase';

export const supabase = useLocal
  ? mockSupabase
  : createClient<Database>(supabaseUrl!, supabaseAnonKey!);

if (!useLocal && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Missing Supabase keys, falling back to Local DB');
  // Optional: Auto-fallback if keys missing?
}
