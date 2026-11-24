// Unggah gambar: validasi, kompres via Canvas (otomatis membuang EXIF), simpan ke Storage privat.
import { supabase, BUCKET } from './supabase-client.js';

export const MAX_FILES = 3;
const TIPE = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // batas file asli
const MAX_SISI = 1600;

export function validasiFile(file) {
  if (!TIPE.includes(file.type)) return 'Format tidak didukung. Gunakan JPG, PNG, atau WEBP.';
  if (file.size > MAX_BYTES) return 'Ukuran file terlalu besar (maks 10 MB).';
  return null;
}

// Menggambar ulang ke canvas = metadata EXIF hilang; keluaran WEBP/JPEG
export async function kompres(file) {
  const bmp = await createImageBitmap(file);
  const skala = Math.min(1, MAX_SISI / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * skala);
  c.height = Math.round(bmp.height * skala);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  let tipe = 'image/webp';
  let blob = await new Promise((r) => c.toBlob(r, tipe, 0.82));
  if (!blob || blob.type !== 'image/webp') {
    tipe = 'image/jpeg';
    blob = await new Promise((r) => c.toBlob(r, tipe, 0.82));
  }
  return { blob, ext: tipe === 'image/webp' ? 'webp' : 'jpg' };
}

// Nama acak: tidak membawa nama file asli
export async function unggah(blob, ext) {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return path;
}
