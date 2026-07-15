# Product Requirement Document (PRD)
# Smart Visitor Attendance Perpustakaan Labschool Jakarta

## Ringkasan
Aplikasi absensi pengunjung perpustakaan berbasis Face Recognition yang dapat diakses melalui komputer perpustakaan maupun smartphone menggunakan QR Code. Pengunjung baru melakukan registrasi satu kali, selanjutnya cukup melakukan scan wajah.

## Tujuan
- Absensi tanpa buku tamu.
- Registrasi otomatis saat kunjungan pertama.
- Statistik kunjungan real-time.
- PWA untuk desktop dan mobile.

## Teknologi
### Frontend
- React + Vite
- TypeScript
- Tailwind CSS
- Progressive Web App (PWA)

### Backend
- Firebase Authentication (Admin)
- Firebase Firestore
- Firebase Hosting

### AI
- MediaPipe Face Detection / Face-api.js
- TensorFlow.js

## Alur Pengguna

### Pengunjung Baru
1. Scan QR Code.
2. Browser membuka aplikasi.
3. Kamera aktif.
4. Scan wajah.
5. Jika wajah belum dikenali, tampil formulir registrasi.
6. Pengunjung mengisi:
   - Nama
   - Kategori (Siswa/Guru/Karyawan/Pimpinan)
   - Jika Siswa: Jenjang (SMP/SMA), Kelas
   - Jika Guru: Unit (KB/TK, SMP, SMA)
   - Jika Karyawan: Bagian
   - Jika Pimpinan: Jabatan
7. Sistem membuat face embedding.
8. Data disimpan ke Firestore.
9. Absensi pertama otomatis tercatat.

### Pengunjung Lama
1. Scan QR Code.
2. Kamera aktif.
3. Scan wajah.
4. Sistem mencocokkan face embedding.
5. Absensi berhasil.

## Firestore

### visitors
```text
id
nama
kategori
jenjang
kelas
unit
bagian
jabatan
faceEmbedding
createdAt
updatedAt
```

### attendance
```text
id
visitorId
nama
kategori
jenjang
kelas
unit
bagian
jabatan
tanggal
jam
device
metode
createdAt
```

### admins
Data admin.

### settings
Konfigurasi aplikasi.

## Dashboard
- Total pengunjung hari ini
- SMP
- SMA
- Guru
- Karyawan
- Pimpinan
- Grafik harian
- Grafik bulanan
- Grafik per jam
- Statistik kelas, unit, bagian, jabatan

## Laporan
Filter:
- Tanggal
- Bulan
- Tahun
- Kategori

Ekspor:
- PDF
- Excel

## Hak Akses

### Admin
- Dashboard
- Kelola data pengunjung
- Hapus/Edit data
- Laporan
- Statistik

### Pengunjung
- Registrasi pertama
- Scan wajah
- Melihat status absensi

## Keamanan
- HTTPS
- Face embedding disimpan di Firestore.
- Pembatasan absensi ganda dalam interval tertentu.
- Firestore Security Rules.

## Catatan Teknis (Final)

Aplikasi **tidak menggunakan Firebase Storage**.

Foto wajah **tidak disimpan** ke database.

Alur yang digunakan:
1. Kamera mengambil foto sementara di browser.
2. AI membuat **face embedding**.
3. Face embedding disimpan ke Firestore.
4. Foto asli langsung dihapus dari memori browser.

Keuntungan:
- Privasi lebih baik.
- Hemat biaya.
- Firestore tetap ringan.
- Tidak terkena batas ukuran dokumen karena gambar tidak disimpan.
