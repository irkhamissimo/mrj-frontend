# Mindful Hafidz

## 🇮🇩 Deskripsi Singkat
Mindful Hafidz adalah aplikasi web untuk membantu proses menghafal, menyetor, dan murajaah (revisi) hafalan Al-Qur'an secara terstruktur dan produktif. Aplikasi ini menyediakan fitur manajemen hafalan baru (ziyadah), revisi (murajaah), statistik produktivitas, serta autentikasi pengguna.

## 🇬🇧 Short Description
Mindful Hafidz is a web application to help users memorize, submit, and revise (murajaah) Quranic memorization in a structured and productive way. The app provides new memorization (ziyadah) management, revision (murajaah), productivity statistics, and user authentication features.

---

## 🇮🇩 Fitur Utama
- **Ziyadah (Hafalan Baru):** Catat, kelola, dan pantau progres hafalan baru setiap hari.
- **Vault (Hafalan Belum Disetor):** Daftar hafalan yang belum diverifikasi/setor.
- **Murajaah:** Jadwalkan dan lakukan sesi revisi hafalan dengan timer dan indikator progres.
- **Revisi Hafalan:** Lihat daftar hafalan yang sudah selesai dan lakukan revisi bertahap.
- **Statistik Produktivitas:** Pantau statistik harian, mingguan, dan bulanan dalam bentuk grafik.
- **Autentikasi:** Registrasi dan login untuk keamanan data hafalan.

## 🇬🇧 Main Features
- **Ziyadah (New Memorization):** Record, manage, and track new daily memorization progress.
- **Vault (Unsubmitted Memorization):** List of memorization entries pending verification/submission.
- **Murajaah (Revision):** Schedule and perform revision sessions with timer and progress indicators.
- **Revision:** View completed memorization and perform step-by-step revision.
- **Productivity Statistics:** Monitor daily, weekly, and monthly stats with charts.
- **Authentication:** Register and login for secure memorization data.

---

## 🇮🇩 Instalasi & Menjalankan
1. **Clone repositori ini:**
   ```bash
   git clone <repo-url>
   cd frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Konfigurasi environment:**
   - Buat file `.env` atau gunakan variabel `VITE_API_URL` untuk mengatur endpoint backend API.
4. **Jalankan aplikasi:**
   ```bash
   npm run dev
   ```

## 🇬🇧 Installation & Running
1. **Clone this repository:**
   ```bash
   git clone <repo-url>
   cd frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment:**
   - Create a `.env` file or set the `VITE_API_URL` variable to point to your backend API endpoint.
4. **Run the app:**
   ```bash
   npm run dev
   ```

---

## 🇮🇩 Teknologi yang Digunakan
- React 18
- Vite
- TailwindCSS
- MUI (Material UI)
- Radix UI
- Recharts

## 🇬🇧 Technologies Used
- React 18
- Vite
- TailwindCSS
- MUI (Material UI)
- Radix UI
- Recharts

---

## 🇮🇩 Struktur Navigasi Utama
- `/login` & `/register` — Autentikasi pengguna
- `/ziyadah` — Hafalan baru (ziyadah)
- `/vault` — Hafalan belum disetor
- `/murajaah` — Sesi murajaah
- `/revisions` — Daftar hafalan selesai
- `/revision/:entryId` — Sesi revisi per hafalan
- `/stats` — Statistik produktivitas

## 🇬🇧 Main Navigation Structure
- `/login` & `/register` — User authentication
- `/ziyadah` — New memorization (ziyadah)
- `/vault` — Unsubmitted memorization
- `/murajaah` — Murajaah sessions
- `/revisions` — Completed memorization list
- `/revision/:entryId` — Revision session per memorization
- `/stats` — Productivity statistics

---

## 🇮🇩 Lisensi
Aplikasi ini dikembangkan untuk keperluan edukasi dan non-komersial.

## 🇬🇧 License
This app is developed for educational and non-commercial purposes.
