/* ═══════════════════════════════════════════════════════════════
   HisabX — Supabase Client
   ═══════════════════════════════════════════════════════════════ */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eswewtefxrpmjwbjhwkb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EwvNbLpvnb-eijv_TjIFDw_8neD21MZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
