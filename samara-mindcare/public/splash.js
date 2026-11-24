// Menentukan apakah layar sambutan / skeleton halaman ditampilkan.
// - Layar sambutan: hanya saat pertama kali membuka website (sesi baru) atau saat halaman di-refresh.
// - Perpindahan halaman lewat klik tautan (navbar dll.) atau tombol Kembali/Maju: TANPA skeleton & splash
//   (kelas "nav-soft"), supaya transisi mulus tanpa jeda.
// Berkas ini dimuat sinkron di <head> (tanpa inline script, sesuai CSP) agar tidak ada kilatan konten.
(function () {
  try {
    var de = document.documentElement;
    var nav = performance.getEntriesByType('navigation')[0];
    var tipe = nav && nav.type;
    var reload = tipe === 'reload';
    var t = parseInt(sessionStorage.getItem('samara_nav') || '0', 10);
    sessionStorage.removeItem('samara_nav');
    var dariKlik = t && Date.now() - t < 15000;
    var sudahAda = !!sessionStorage.getItem('samara_splash');
    if (!reload && sudahAda && (dariKlik || tipe === 'back_forward')) de.classList.add('nav-soft');
    else if (reload || !sudahAda) de.classList.add('splash-on');
    sessionStorage.setItem('samara_splash', '1');
    // Saat layar sambutan tampil (refresh / pertama kali buka), halaman harus mulai dari paling atas:
    // matikan pemulihan posisi gulir bawaan peramban (dikembalikan ke normal setelah splash selesai, lihat ui.js)
    if (de.classList.contains('splash-on') && !location.hash && 'scrollRestoration' in history) { history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }
    // Status tombol Masuk/Dashboard ditentukan sebelum render pertama: ada token sesi -> Dashboard, tidak ada -> Masuk (lihat src/js/ui.js)
    var token = false;
    for (var i = 0; i < localStorage.length; i++) { if (/^sb-.+-auth-token$/.test(localStorage.key(i))) { token = true; break; } }
    if (token) if (localStorage.getItem('samara_adm_ok') !== '0') de.classList.add('adm-on');
  } catch (e) { /* abaikan */ }
})();
