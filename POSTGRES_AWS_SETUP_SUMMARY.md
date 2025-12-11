# ✅ Setup PostgreSQL AWS RDS - Summary

## Status Saat Ini

✅ **File `.env` sudah dikonfigurasi**
```
POSTGRES_URL=postgresql://postgres:Veth0581!@violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com:5432/violet
```

✅ **Package `pg` sudah di-install**
```
yarn add pg ^8.11.3
```

✅ **Kode aplikasi sudah diubah dari MongoDB ke PostgreSQL**
- `script/database/postgres.ts` - Database adapter
- `script/database/postgres-auth.ts` - Authentication state
- `script/handlers/postgres-store.ts` - Chat/contact/message storage

## ❌ Masalah: Security Group AWS RDS

Koneksi gagal karena security group AWS RDS belum dikonfigurasi.

### Error saat ini:
```
Error: connect ETIMEDOUT 172.31.6.46:5432
```

Ini terjadi karena EC2 instance Anda tidak bisa terhubung ke RDS database.

## 🔧 Cara Fix: Setup Security Group

### Quick Fix (Development Only)

Buka AWS Console dan:

1. **Buka RDS Database Console**: https://console.aws.amazon.com/rds/
2. **Pilih database `violet`**
3. **Tab "Connectivity & security"** → catat **VPC security groups** (misal: `sg-abc123`)
4. **Buka EC2 Console**: https://console.aws.amazon.com/ec2/
5. **Security Groups** → pilih security group dari step 3
6. **Edit Inbound Rules**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: `0.0.0.0/0` (Development ONLY!)
7. **Save rules**
8. **Tunggu 30 detik** hingga rules aktif
9. **Test koneksi**:
   ```bash
   node test-postgres-connection.js
   ```

### Atau Gunakan Script Helper

```bash
# Pastikan AWS CLI sudah installed dan dikonfigurasi
aws configure

# Jalankan script helper
bash aws-rds-setup.sh
```

Script akan membantu:
- Mencari security group RDS
- Menambah inbound rules
- Menampilkan current rules
- Test koneksi

## 🚀 Setelah Security Group Dikonfigurasi

```bash
# 1. Test koneksi
node test-postgres-connection.js

# 2. Install dependencies (jika belum)
yarn install

# 3. Build dan jalankan
yarn start
```

## 📝 File-file yang Telah Dibuat

### PostgreSQL Implementation
- `script/database/postgres.ts` - PostgreSQL adapter
- `script/database/postgres-auth.ts` - Session storage
- `script/handlers/postgres-store.ts` - Data storage

### Setup & Documentation
- `.env` - Configuration (sudah ada POSTGRES_URL)
- `test-postgres-connection.js` - Connection test script
- `AWS_RDS_SETUP.md` - Detailed AWS setup guide
- `aws-rds-setup.sh` - Interactive helper script
- `POSTGRES_MIGRATION.md` - Migration documentation
- `SETUP_POSTGRESQL.md` - PostgreSQL setup guide
- `postgres-init.sql` - SQL initialization script

## 🔐 Security Notes

1. **Password di `.env`**: File ini TIDAK boleh di-commit ke git
   ```bash
   # Check .gitignore
   cat .gitignore | grep ".env"
   ```

2. **Production Security**:
   - Jangan gunakan `0.0.0.0/0` untuk source
   - Gunakan security group EC2 sebagai source
   - Enable SSL: `?sslmode=require`
   - Ganti password default RDS

3. **Backup**:
   ```bash
   # Backup database
   pg_dump -h violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com \
           -U postgres \
           -d violet \
           -f backup.sql
   ```

## 📞 Troubleshooting

### Masalah: ETIMEDOUT
```
Error: connect ETIMEDOUT
```
→ Security group RDS tidak mengizinkan koneksi dari EC2

### Masalah: FATAL: password authentication failed
```
FATAL: password authentication failed for user "postgres"
```
→ Password salah atau perlu di-update di RDS

### Masalah: Database tidak ada
```
FATAL: database "violet" does not exist
```
→ Buat database di RDS:
```bash
psql -h violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com \
     -U postgres \
     -c "CREATE DATABASE violet;"
```

## 🎯 Urutan Setup

```
1. ✅ Package `pg` di-install
2. ✅ File `.env` dikonfigurasi  
3. ✅ Kode aplikasi sudah di-update
4. ⏳ Setup Security Group AWS (ANDA DI SINI)
5. ⏳ Test koneksi
6. ⏳ Jalankan aplikasi
```

## ℹ️ Info Database AWS RDS Anda

- **Hostname**: violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com
- **Port**: 5432
- **Username**: postgres
- **Password**: Veth0581!
- **Database**: violet
- **Region**: ap-southeast-2 (Sydney)

---

Silakan setup security group, kemudian jalankan:
```bash
node test-postgres-connection.js
```

Setelah test berhasil, Anda bisa menjalankan aplikasi dengan:
```bash
yarn start
```
