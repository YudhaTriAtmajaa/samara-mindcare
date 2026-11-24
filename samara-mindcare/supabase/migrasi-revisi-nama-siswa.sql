-- Revisi: kolom nama siswa pada laporan. Aman dijalankan berulang kali.
-- Jalankan di Supabase -> SQL Editor SEBELUM mendeploy ulang Edge Function kirim-laporan.
alter table public.laporan add column if not exists nama_terdampak text check (char_length(nama_terdampak) <= 200);
alter table public.laporan add column if not exists nama_pelaku text check (char_length(nama_pelaku) <= 200);
