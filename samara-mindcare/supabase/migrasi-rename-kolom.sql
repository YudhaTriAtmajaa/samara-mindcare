-- Penyesuaian setelah kolom tabel `laporan` diganti namanya di Supabase.
-- Jalankan di Supabase -> SQL Editor (aman dijalankan berulang).
-- Fungsi pembatas kiriman sebelumnya memakai kolom lama `dibuat_pada`; tanpa ini INSERT laporan akan gagal.
create or replace function public.batasi_kiriman() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.laporan where tanggal_masuk > now() - interval '1 minute') >= 30 then
    raise exception 'Terlalu banyak kiriman, coba lagi sebentar lagi.';
  end if;
  return new;
end $$;

-- Opsional: samakan indeks dengan nama kolom baru (indeks otomatis mengikuti rename kolom, ini hanya merapikan nama)
drop index if exists public.laporan_status_idx;
create index if not exists laporan_status_idx on public.laporan (status, tanggal_masuk desc);
