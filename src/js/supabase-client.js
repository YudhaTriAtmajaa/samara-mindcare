// Klien Supabase (hanya kunci anon publik; RLS yang melindungi data)
import { createClient } from '@supabase/supabase-js';

// Bersihkan URL: buang spasi, "/rest/v1" dan garis miring di akhir
const bersih = (u) => String(u || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

export const supabase = createClient(
  bersih(import.meta.env.VITE_SUPABASE_URL),
  String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export const BUCKET = 'laporan-gambar';