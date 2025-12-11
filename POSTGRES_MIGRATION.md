# Migrasi MongoDB ke PostgreSQL

## Perubahan yang Dilakukan

Anda sekarang telah berhasil mengganti MongoDB dengan PostgreSQL dalam aplikasi Anda. Berikut adalah file-file baru dan perubahan yang dilakukan:

### File Baru Dibuat:

1. **`script/database/postgres.ts`**
   - Kelas `PostgresBase` yang menggantikan `MongoBase`
   - Menyediakan interface yang sama untuk operasi database (query, insert, update, delete)
   - Dukungan untuk transaksi dan retry logic

2. **`script/database/postgres-auth.ts`**
   - Fungsi `singleSessionPostgres()` yang menggantikan `singleSessionMongo()`
   - Menyimpan kredensial WhatsApp dan state di PostgreSQL
   - Struktur tabel: `wa_auth` dengan kolom `session_id` dan `auth` (JSON)

3. **`script/handlers/postgres-store.ts`**
   - Fungsi `createPostgresStore()` yang menggantikan `createMongoStore()`
   - Menyimpan chat, kontak, dan pesan di PostgreSQL
   - Tabel-tabel yang dibuat:
     - `wa_chats` - Menyimpan data chat/percakapan
     - `wa_contacts` - Menyimpan data kontak
     - `wa_messages` - Menyimpan pesan dengan indexing untuk performa

### File yang Dimodifikasi:

1. **`package.json`**
   - Ditambahkan: `"pg": "^8.11.3"` (driver PostgreSQL)

2. **`script/index.ts`**
   - Import diubah dari `singleSessionMongo` ke `singleSessionPostgres`
   - Import diubah dari `createMongoStore` ke `createPostgresStore`
   - Konfigurasi environment berubah dari `MONGO_URI` dan `MONGO_DB` ke `POSTGRES_URL`

3. **`script/database/index.ts`**
   - Export diubah ke file PostgreSQL baru

4. **`script/handlers/index.ts`**
   - Ditambahkan export untuk `postgres-store`

## Cara Menggunakan

### 1. Setup Environment Variable

Ganti `.env` atau file konfigurasi Anda dengan:

```bash
POSTGRES_URL=postgresql://username:password@localhost:5432/violet
```

Format URL PostgreSQL:
```
postgresql://[user[:password]@][netaddr][:port][/dbname][?param1=value1&...]
```

Contoh:
```bash
# Local development
POSTGRES_URL=postgresql://postgres:password@localhost:5432/violet

# Remote server
POSTGRES_URL=postgresql://user:pass@db.example.com:5432/violet
```

### 2. Install Dependencies

```bash
yarn install
# atau
npm install
```

### 3. Jalankan Aplikasi

```bash
yarn start
# atau
npm start
```

Aplikasi akan otomatis membuat tabel-tabel yang diperlukan saat pertama kali dijalankan.

## Fitur-fitur PostgreSQL yang Digunakan

- **JSONB**: Untuk menyimpan data kompleks (message, contact info)
- **ON CONFLICT ... DO UPDATE**: Untuk upsert operations
- **Indexes**: Untuk performa query yang lebih baik
- **Timestamps**: `created_at` dan `updated_at` otomatis
- **Connection Pooling**: Untuk manajemen koneksi yang efisien

## Perbandingan dengan MongoDB

| Aspek | MongoDB | PostgreSQL |
|-------|---------|-----------|
| Tipe | NoSQL Document | Relational |
| Schema | Flexible | Fixed (tapi ada JSONB) |
| Upsert | `$set` operator | ON CONFLICT |
| Tipe Data | BSON | Native types + JSONB |
| Transaction | Supported | Fully supported |
| Indexes | Built-in | Excellent support |

## Troubleshooting

### Koneksi ke Database Gagal
```
Error: ECONNREFUSED
```
- Pastikan PostgreSQL server berjalan
- Cek POSTGRES_URL sudah benar
- Pastikan user dan password sudah sesuai

### Tabel Sudah Ada
```
relation "wa_auth" already exists
```
- Ini normal, aplikasi akan skip pembuatan tabel jika sudah ada
- Jika ingin reset, gunakan: `DROP TABLE IF EXISTS wa_auth, wa_chats, wa_contacts, wa_messages;`

### Query Lambat
- Indexes sudah dibuat otomatis
- Untuk performa lebih baik, bisa tambah `--watch` mode

## Migrasi Data dari MongoDB (Opsional)

Jika Anda ingin migrasi data dari MongoDB yang sudah ada:

```typescript
// Buat script migrasi manual
// 1. Export data dari MongoDB
// 2. Transform ke format PostgreSQL
// 3. Import ke PostgreSQL
```

Hubungi developer jika Anda memerlukan bantuan migrasi data.

## Keuntungan Menggunakan PostgreSQL

✅ **Lebih Stabil**: Relational database yang proven  
✅ **Lebih Cepat**: Query optimization yang lebih baik  
✅ **Lebih Aman**: ACID guarantees dan backup lebih mudah  
✅ **Free & Open Source**: Tanpa biaya lisensi  
✅ **Community Besar**: Support dan dokumentasi lengkap  
✅ **JSON Support**: JSONB untuk data semi-structured  

Semoga migrasi Anda berjalan lancar! 🚀
