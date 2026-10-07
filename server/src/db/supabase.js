import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseKey.includes('placeholder')
);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export async function pingSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      configured: false,
      message: 'Supabase URL or Key not set in environment. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.'
    };
  }

  try {
    const { data, error } = await supabase.from('players').select('count', { count: 'exact', head: true });
    if (error) {
      return { ok: false, configured: true, error: error.message };
    }
    return { ok: true, configured: true, message: 'Supabase connected successfully.' };
  } catch (err) {
    return { ok: false, configured: true, error: err.message };
  }
}
