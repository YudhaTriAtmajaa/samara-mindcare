// Konfigurasi Vite mode multi-halaman
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import chromePlugin from './vite-plugin-chrome.js';

const r = (p) => resolve(__dirname, p);

export default defineConfig({
  plugins: [chromePlugin()],
  build: {
    rollupOptions: {
      input: {
        index: r('index.html'),
        layanan: r('layanan.html'),
        informasi: r('informasi.html'),
        tentang: r('tentang.html'),
        adminLogin: r('admin/login.html'),
        adminDashboard: r('admin/dashboard.html'),
        adminData: r('admin/data-laporan.html'),
        adminTindak: r('admin/tindak-lanjut.html'),
        adminForm: r('admin/form-tindak-lanjut.html'),
        adminStatistik: r('admin/statistik.html'),
        adminPetugas: r('admin/petugas.html'),
      },
    },
  },
});
