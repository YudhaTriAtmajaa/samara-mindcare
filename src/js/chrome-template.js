// Templat navbar & footer bersama. Modul murni (tanpa DOM/CSS) agar dipakai oleh ui.js DAN plugin Vite
// yang menyisipkannya ke HTML saat build, sehingga navbar sudah ada sejak render pertama (tanpa kedip saat pindah halaman).

export const NAV = [
  ['beranda', '/index.html', 'Beranda'],
  ['layanan', '/layanan.html', 'Layanan Laporan'],
  ['informasi', '/informasi.html', 'Pusat Informasi'],
];

// (parameter sesi tidak dipakai lagi; status tombol diatur lewat kelas <html>)
export function navbarHTML(active, icon, sesi = false) {
  const links = NAV.map(([k, h, t]) => `<a href="${h}" class="${k === active ? 'active' : ''}">${t}</a>`).join('');
  return `<header class="navbar">
    <a class="brand" href="/index.html" aria-label="SAMARA MindCare - SMA Muhammadiyah 2 Samarinda, ke beranda"><img class="brand-img" src="/logo/logo-horizontal.png" alt="SAMARA MindCare" width="426" height="143" decoding="async"></a>
    <button class="nav-toggle" type="button" aria-label="Buka menu" aria-expanded="false" aria-controls="nav-panel">${icon('menu')}</button>
    <div class="nav-panel" id="nav-panel"><nav class="nav-menu" aria-label="Navigasi utama">${links}</nav>
    <div class="nav-actions"><a class="btn btn-orange btn-sm" href="/layanan.html">Sampaikan Laporan</a><a class="btn btn-green btn-sm" data-masuk href="/admin/login.html"><span class="lbl-masuk">Masuk</span><span class="lbl-dash">Dashboard</span></a></div></div>
  </header>`;
}


export function footerHTML() {
  return `<footer class="footer">
    <div class="footer-grid">
      <div class="footer-brand"><a class="brand" href="/index.html" aria-label="SAMARA MindCare, ke beranda"><img class="brand-img brand-img-f" src="/logo/logo-horizontal.png" alt="SAMARA MindCare" width="426" height="143" loading="lazy" decoding="async"></a>
        <p>Ruang aman pendampingan, kepedulian psikologis terpadu, dan perlindungan kesehatan mental bagi seluruh civitas akademika SMA Muhammadiyah 2 Samarinda.</p></div>
      <div><h4>Navigasi</h4><ul><li><a href="/index.html">Beranda</a></li><li><a href="/layanan.html">Layanan Laporan</a></li><li><a href="/informasi.html">Pusat Informasi</a></li></ul></div>
      <div><h4>Lokasi</h4><ul><li>Ruang Guru Kampus SMA Muhammadiyah 2 Samarinda</li><li>Jl. Slamet Riyadi Gang II, Karang Asam Ilir / Teluk Lerong Ulu, Kecamatan Sungai Kunjang.</li></ul></div>
    </div>
    <div class="footer-bottom"><span>© 2026 SMA Muhammadiyah 2 Samarinda • SAMARA MindCare. Hak Cipta Dilindungi.</span><span>Lingkungan Ramah • Dukungan Psikologis Terbuka</span></div>
  </footer>`;
}

