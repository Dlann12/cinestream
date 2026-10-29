# 🎬 CineStream — Platform Streaming Film Gratis & Legal

CineStream adalah platform web streaming film modern yang menyajikan film-film berlisensi terbuka (*Open Movie* Creative Commons CC-BY oleh Blender Foundation dan Domain Publik) secara 100% legal, gratis, dan tanpa perlu registrasi berbayar.

Aplikasi ini dibangun menggunakan arsitektur web modern yang ringan tanpa ketergantungan framework berat, sehingga cepat diakses dan dapat langsung di-deploy ke **GitHub Pages**.

---

## 📁 Struktur Direktori Proyek

Proyek ini telah dipisahkan secara modular sesuai dengan jenis dan fungsinya:

```text
cinestream/
├── index.html              # Halaman utama aplikasi (Entry point web & GitHub Pages)
├── css/
│   └── style.css           # Styling kustom (Cinematic gradients, scrollbar, animasi)
├── js/
│   ├── tailwind-config.js  # Konfigurasi Tailwind CSS (Color palette, font display)
│   ├── data.js             # Katalog data film legal & daftar genre/kategori
│   └── app.js              # Logika aplikasi, state management, router SPA, player & admin
├── .gitignore              # Berkas pengecualian Git
└── README.md               # Dokumentasi resmi proyek
```

---

## ✨ Fitur Utama

1. **Hero Spotlight & Banner Dinamis**
   - Menampilkan film pilihan (*featured*) lengkap dengan sinopsis, badge lisensi, tombol putar langsung, dan trailer modal.
2. **Katalog & Filter Film Fleksibel**
   - Pencarian real-time berdasarkan judul film atau cast.
   - Filter berdasarkan Genre (Sci-Fi, Action, Animation, Drama, dll.), Era Tahun Rilis, Bahasa, dan Urutan Popularitas / Rating.
3. **Eksplorasi Genre & Koleksi**
   - Tampilan visual kartu genre dengan gradasi warna menarik dan jumlah judul film tersedia.
4. **Pemutar Video Khusus (Custom Streaming Player)**
   - Mendukung multi-server stream (Primary CDN & Backup Mirror).
   - Fitur pemilihan resolusi (1080p, 720p, 480p).
   - Kontrol subtitle interaktif (Bahasa Indonesia & English).
   - Auto-save progress nonton (*Resume Playback*) tersimpan di LocalStorage browser.
   - Mode Theater, Fullscreen, Picture-in-Picture (PiP), dan pengatur volume suara.
5. **Daftar Tontonan (Watchlist) & Riwayat Nonton**
   - Tambah/hapus film favorit ke Watchlist dengan satu klik.
   - Riwayat tontonan dengan indikator progres persentase durasi.
6. **Admin Dashboard & Manajemen Konten**
   - Kelola katalog film: Tambah film baru, edit data, atau hapus film.
   - Monitoring metrik performa: Total tayangan, rasio keberhasilan streaming, dan log aktivitas real-time.
7. **Desain Responsif & Tema Gelap Elegan**
   - Tampilan optimal untuk smartphone, tablet, laptop, dan monitor desktop beresolusi tinggi.

---

## 🚀 Cara Menjalankan Secara Lokal

Proyek ini berbasis file statis, sehingga Anda dapat langsung menjalankannya dengan salah satu cara berikut:

### Opsi 1: Menggunakan Python (Praktis)
```bash
# Jalankan server lokal di dalam direktori cinestream
python3 -m http.server 8000
```
Buka browser dan akses: `http://localhost:8000`

### Opsi 2: Menggunakan VS Code Live Server
- Buka folder `cinestream` di VS Code.
- Klik kanan file `index.html` lalu pilih **Open with Live Server**.

### Opsi 3: Menggunakan Node.js `serve`
```bash
npx serve .
```

---

## 📤 Panduan Push ke GitHub

Untuk mengunggah proyek ini ke repositori GitHub Anda:

1. **Inisialisasi Git (jika belum):**
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi struktur modular CineStream (HTML, CSS, JS terpisah)"
   ```

2. **Hubungkan ke Repositori GitHub Anda:**
   ```bash
   # Buat repository baru di github.com, lalu jalankan:
   git remote add origin https://github.com/<username-anda>/<nama-repo>.git
   git branch -M main
   git push -u origin main
   ```

3. **Aktifkan GitHub Pages (Opsional - untuk hosting gratis):**
   - Buka repositori Anda di GitHub.
   - Masuk ke tab **Settings** > **Pages**.
   - Pada bagian **Build and deployment** > **Source**, pilih **Deploy from a branch**.
   - Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
   - Website CineStream Anda akan langsung online dan bisa diakses publik!

---

## ⚖️ Sumber Konten & Hak Cipta

Semua konten video dan data media yang digunakan dalam demonstrasi ini berasal dari:
- **Blender Animation Studio / Blender Foundation Open Movies** ([Creative Commons Attribution CC-BY](https://www.blender.org/about/projects/))
- **Public Domain & Creative Commons Archives**

---

## 🛠️ Teknologi yang Digunakan

- **HTML5 Semantic Markup**
- **Tailwind CSS (JIT via CDN)**
- **Vanilla JavaScript (ES6+)**
- **Google Fonts (Outfit & Inter)**
- **Font Awesome 6 (Icons)**
