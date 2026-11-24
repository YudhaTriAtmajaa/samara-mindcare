// Keamanan tampilan: escape teks pengguna & pembuat elemen aman (anti-XSS).
// Aturan: data pengguna HANYA dimasukkan lewat textContent / setAttribute, tidak pernah innerHTML.

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Buat elemen dengan teks aman. attrs: objek atribut; children: array node/teks
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// Hanya izinkan URL https untuk gambar (signed URL Supabase)
export function urlAman(u) {
  try { return new URL(u).protocol === 'https:' ? u : ''; } catch { return ''; }
}

export function formatTanggal(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
