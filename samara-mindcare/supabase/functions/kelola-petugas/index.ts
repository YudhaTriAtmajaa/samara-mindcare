// Edge Function: tambah / aktifkan-nonaktifkan petugas. Hanya petugas aktif yang boleh memanggil.
// Kunci service role HANYA ada di sini (variabel lingkungan Supabase), tidak di front-end.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Verifikasi pemanggil
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: 'Tidak diizinkan.' }, 401);
  const { data: me } = await admin.from('petugas').select('aktif').eq('user_id', u.user.id).maybeSingle();
  if (!me?.aktif) return json({ error: 'Tidak diizinkan.' }, 403);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: 'Permintaan tidak valid.' }, 400); }

  if (b.aksi === 'tambah') {
    const nama = String(b.nama ?? '').trim().slice(0, 100);
    const email = String(b.email ?? '').trim().toLowerCase();
    const password = String(b.password ?? '');
    if (!nama || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 12) return json({ error: 'Data tidak valid (kata sandi minimal 12 karakter).' }, 400);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return json({ error: 'Gagal membuat akun.' }, 400);
    const ins = await admin.from('petugas').insert({ user_id: data.user.id, nama, email });
    if (ins.error) { await admin.auth.admin.deleteUser(data.user.id); return json({ error: 'Gagal menyimpan petugas.' }, 400); }
    return json({ ok: true });
  }

  if (b.aksi === 'aktif') {
    if (b.user_id === u.user.id) return json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, 400);
    const { error } = await admin.from('petugas').update({ aktif: !!b.aktif }).eq('user_id', String(b.user_id));
    if (error) return json({ error: 'Gagal memperbarui.' }, 400);
    return json({ ok: true });
  }
  return json({ error: 'Aksi tidak dikenal.' }, 400);
});
