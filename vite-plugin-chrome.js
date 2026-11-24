// Plugin Vite: menyisipkan navbar, footer, dan ikon <i data-ic> langsung ke HTML (saat build & dev server).
// Hasilnya navbar/konten sudah ada pada render pertama, jadi perpindahan halaman tidak lagi menunggu JavaScript.
import { icon } from './src/js/icons.js';
import { navbarHTML, footerHTML } from './src/js/chrome-template.js';

export default function chromePlugin() {
  return {
    name: 'samara-chrome',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Navbar & footer (hanya halaman publik yang punya #navbar / #footer kosong)
        html = html.replace(/<div id="navbar" data-active="([\w-]*)"><\/div>/, (_, a) => `<div id="navbar" data-active="${a}">${navbarHTML(a, icon)}</div>`);
        html = html.replace(/<div id="footer"><\/div>/, `<div id="footer">${footerHTML()}</div>`);
        // Ikon statis
        return html.replace(/<i data-ic="([\w-]+)"><\/i>/g, (_, n) => icon(n));
      },
    },
  };
}
