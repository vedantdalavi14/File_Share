import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huhajqphugttiiuslknl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or anonymous key. Make sure VITE_SUPABASE_ANON_KEY is set in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey); 