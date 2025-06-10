import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = 'https://huhajqphugttiiuslknl.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase URL or service role key. Make sure SUPABASE_SERVICE_ROLE_KEY is set in your .env file.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceKey); 