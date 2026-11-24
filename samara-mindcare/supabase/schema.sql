-- Skema SAMARA MindCare. Tidak ada kolom NIS / IP / perangkat pelapor.

create extension if not exists pgcrypto;

-- Laporan siswa (nama kolom mengikuti tabel terbaru di Supabase)
create table if not exists public.laporan (
  id uuid primary key default gen_random_uuid(),
  nama_terdampak text check (char_length(nama_terdampak) <= 200),
  nama_pelaku text check (char_length(nama_pelaku) <= 200),
  kategori_isu text not null check (kategori_isu in ('mental','bullying','rokok')),
  tanggal_masuk timestamptz not null default now(),
  siswa_yang_berkaitan text not null check (siswa_yang_berkaitan in ('diri_sendiri','siswa_lain','disaksikan')),
  waktu text check (char_length(waktu) <= 200),
  lokasi text check (char_length(lokasi) <= 200),
  "bentuk keluhan / kondisi utama yang dirasakan" text not null check (char_length("bentuk keluhan / kondisi utama yang dirasakan") <= 200),
  "Situasi / Kondisi Pemicu (khusus Kesehatan Mental)" text check (char_length("Situasi / Kondisi Pemicu (khusus Kesehatan Mental)") <= 200),
  perkiraan_durasi_yang_dirasakan text check (char_length(perkiraan_durasi_yang_dirasakan) <= 200),
  isi text not null check (char_length(isi) between 1 and 1200),
  gambar text[] not null default '{}' check (coalesce(array_length(gambar,1),0) <= 3),
  status text not null default 'belum' check (status in ('belum','sudah')),
  ditindak_oleh uuid references auth.users(id) on delete set null,
  ditindak_pada timestamptz,
  ditindak_nama text check (char_length(ditindak_nama) <= 200),
  ditindak_jabatan text check (char_length(ditindak_jabatan) <= 200),
  catatan text check (char_length(catatan) <= 2000)
);
create index if not exists laporan_status_idx on public.laporan (status, tanggal_masuk desc);

-- Petugas / admin (akun dibuat lewat Edge Function, tanpa pendaftaran mandiri)
create table if not exists public.petugas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text not null,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- Pembatasan frekuensi global (tanpa menyimpan IP): hitung kiriman per menit
create or replace function public.batasi_kiriman() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.laporan where tanggal_masuk > now() - interval '1 minute') >= 30 then
    raise exception 'Terlalu banyak kiriman, coba lagi sebentar lagi.';
  end if;
  return new;
end $$;
drop trigger if exists trg_batasi_kiriman on public.laporan;
create trigger trg_batasi_kiriman before insert on public.laporan
  for each row execute function public.batasi_kiriman();

-- Fungsi bantu: apakah pemanggil petugas aktif
create or replace function public.is_petugas() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.petugas p where p.user_id = auth.uid() and p.aktif);
$$;

-- Bucket privat untuk gambar laporan
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('laporan-gambar', 'laporan-gambar', false, 5242880, array['image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;
