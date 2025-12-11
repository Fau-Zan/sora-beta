# Setup PostgreSQL untuk Violet Bot

Panduan lengkap untuk mengatur PostgreSQL sebagai database backend untuk aplikasi Violet WhatsApp Bot.

## Prasyarat

- PostgreSQL 12+ installed
- PostgreSQL client tools (psql)
- Node.js 16+
- Yarn atau npm

## Instalasi PostgreSQL

### Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Jalankan PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Cek status
sudo systemctl status postgresql
```

### macOS

```bash
# Menggunakan Homebrew
brew install postgresql@15

# Jalankan PostgreSQL
brew services start postgresql@15

# Atau manual
pg_ctl -D /usr/local/var/postgres start
```

### Windows

Download installer dari https://www.postgresql.org/download/windows/

## Setup Database

### Method 1: Menggunakan SQL Script (Recommended)

```bash
# Login ke PostgreSQL
sudo -u postgres psql

# Atau jika Anda sudah set password:
psql -U postgres -h localhost

# Jalankan script setup
\i /path/to/postgres-init.sql

# Atau dari command line:
sudo -u postgres psql < postgres-init.sql

# Ganti password default:
ALTER USER violet_user WITH PASSWORD 'your_new_password';
```

### Method 2: Manual Setup

```bash
# Login ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE violet ENCODING 'UTF8';

# Buat user
CREATE USER violet_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT CONNECT ON DATABASE violet TO violet_user;
GRANT USAGE ON SCHEMA public TO violet_user;
GRANT CREATE ON SCHEMA public TO violet_user;

# Connect to database dan set default privileges
\c violet
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO violet_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO violet_user;

# Exit
\q
```

## Konfigurasi Aplikasi

### 1. Setup Environment Variables

Buat file `.env` atau `.env.local`:

```bash
# Copy dari template
cp .env.example .env

# Edit dengan informasi PostgreSQL Anda
nano .env
```

```env
POSTGRES_URL=postgresql://violet_user:your_password@localhost:5432/violet
```

Contoh URL PostgreSQL untuk berbagai konfigurasi:

```env
# Local development (default postgres user)
POSTGRES_URL=postgresql://postgres@localhost:5432/violet

# With password
POSTGRES_URL=postgresql://violet_user:mypassword@localhost:5432/violet

# Remote server
POSTGRES_URL=postgresql://violet_user:password@db.example.com:5432/violet

# With additional options
POSTGRES_URL=postgresql://user:pass@localhost:5432/violet?sslmode=require
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Run Aplikasi

```bash
# Development
yarn start

# Watch mode
yarn start:dev

# Debug
yarn debug
```

Aplikasi akan otomatis membuat tabel-tabel yang diperlukan saat pertama kali dijalankan.

## Verifikasi Database

### Cek apakah database tercipta

```bash
# Login ke PostgreSQL
psql -U violet_user -d violet -h localhost

# Lihat semua tables
\dt

# Lihat schema wa_auth
\d wa_auth

# Lihat data di wa_auth
SELECT * FROM wa_auth;

# Exit
\q
```

## Backup & Restore

### Backup Database

```bash
# Full backup
pg_dump -U violet_user -d violet > violet_backup.sql

# Backup format biner (lebih cepat untuk database besar)
pg_dump -U violet_user -d violet -F c -f violet_backup.dump
```

### Restore Database

```bash
# Dari SQL
psql -U violet_user -d violet < violet_backup.sql

# Dari format biner
pg_restore -U violet_user -d violet violet_backup.dump
```

## Troubleshooting

### Connection Refused

```
psql: error: could not connect to server: could not translate host name "localhost" to address
```

**Solusi:**
```bash
# Cek apakah PostgreSQL running
sudo systemctl status postgresql

# Atau
pg_ctl status -D /usr/local/var/postgres

# Start jika belum running
sudo systemctl start postgresql
```

### Authentication Failed

```
FATAL: Ident authentication failed for user "violet_user"
```

**Solusi:** Edit `/etc/postgresql/12/main/pg_hba.conf` (sesuaikan versi)
- Ubah `ident` menjadi `md5` atau `password`
- Restart PostgreSQL: `sudo systemctl restart postgresql`

### Password tidak Diterima

```bash
# Reset password
sudo -u postgres psql
ALTER USER violet_user WITH PASSWORD 'new_password';
```

### Database sudah ada (saat setup ulang)

```bash
# Drop database jika ingin reset
DROP DATABASE IF EXISTS violet;

# Atau drop dan recreate semua
DROP DATABASE violet;
DROP USER violet_user;

# Kemudian jalankan script setup lagi
```

## Monitoring Database

### Lihat aktif connections

```bash
psql -U violet_user -d violet -c "SELECT count(*) as active_connections FROM pg_stat_activity;"
```

### Lihat query yang sedang berjalan

```bash
psql -U violet_user -d violet -c "SELECT pid, usename, query FROM pg_stat_activity WHERE query != '<IDLE>';"
```

### Lihat database size

```bash
psql -U violet_user -d violet -c "SELECT pg_size_pretty(pg_database_size('violet'));"
```

## Performance Tips

1. **Indexes**: Aplikasi otomatis membuat indexes yang diperlukan
2. **Connection Pooling**: Sudah diimplementasikan di `postgres.ts`
3. **Query Optimization**: Gunakan `EXPLAIN ANALYZE` untuk analisis
4. **Vacuuming**: PostgreSQL otomatis menjalankan VACUUM

## Migrasi dari MongoDB

Jika Anda memiliki data di MongoDB yang ingin dimigrasikan:

```bash
# 1. Export dari MongoDB
mongoexport -c wa_auth -o wa_auth.json

# 2. Transform data (gunakan script Node.js)
# Lihat file POSTGRES_MIGRATION.md untuk detail

# 3. Import ke PostgreSQL
psql -U violet_user -d violet -f import.sql
```

## Links & Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- pg (Node.js Driver): https://node-postgres.com/
- PostgreSQL GUI Tools: pgAdmin, DBeaver, DataGrip
- Database Monitoring: pgAdmin, Grafana

## Support

Jika ada masalah dengan setup, silakan:
1. Cek logs aplikasi: `yarn start`
2. Lihat dokumentasi PostgreSQL
3. Cek koneksi dengan: `psql -U violet_user -d violet -h localhost`

Happy coding! 🚀
