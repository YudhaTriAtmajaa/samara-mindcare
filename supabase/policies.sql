-- RLS aktif di semua tabel
alter table public.laporan enable row level security;
alter table public.petugas enable row level security;

-- Laporan: siswa (anon) tidak punya akses baca. Penyimpanan dilakukan Edge Function
-- 'kirim-laporan' (service role) setelah reCAPTCHA diverifikasi, sehingga tidak ada policy INSERT publik.
drop policy if exists "petugas baca laporan" on public.laporan;
create policy "petugas baca laporan" on public.laporan for select to authenticated
  using (public.is_petugas());

drop policy if exists "petugas ubah tindak lanjut" on public.laporan;
create policy "petugas ubah tindak lanjut" on public.laporan for update to authenticated
  using (public.is_petugas())
  with check (public.is_petugas());

-- Petugas: akun hanya boleh membaca barisnya sendiri; admin membaca semua. Ubah via Edge Function.
drop policy if exists "petugas baca diri sendiri" on public.petugas;
create policy "petugas baca diri sendiri" on public.petugas for select to authenticated
  using (user_id = auth.uid() or public.is_petugas());

-- Storage: siswa hanya boleh MENGUNGGAH (INSERT) ke bucket; tidak boleh membaca/menimpa/menghapus
drop policy if exists "siswa unggah gambar" on storage.objects;
create policy "siswa unggah gambar" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'laporan-gambar' and (storage.foldername(name))[1] is null);

drop policy if exists "petugas baca gambar" on storage.objects;
create policy "petugas baca gambar" on storage.objects for select to authenticated
  using (bucket_id = 'laporan-gambar' and public.is_petugas());
