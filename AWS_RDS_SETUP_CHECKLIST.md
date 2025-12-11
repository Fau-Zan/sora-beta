# AWS RDS Security Group Setup Checklist

## 📋 Pre-Requisites

- [ ] Anda punya akses ke AWS Console
- [ ] Database `violet` sudah dibuat di AWS RDS
- [ ] EC2 instance dan RDS di region yang sama (ap-southeast-2)
- [ ] AWS CLI installed (untuk script helper)

## 🔧 Setup Steps

### Step 1: Dapatkan Security Group IDs

#### Dari AWS Console (GUI):
1. [ ] Buka https://console.aws.amazon.com/rds/
2. [ ] Klik "Databases" di menu kiri
3. [ ] Cari dan klik database `violet`
4. [ ] Buka tab "Connectivity & security"
5. [ ] Catat VPC security groups ID (e.g., `sg-abc123`)
   - RDS Security Group: `___________________`

#### Atau dari Terminal:
```bash
# Dapatkan RDS Security Group
aws rds describe-db-instances \
  --db-instance-identifier violet \
  --region ap-southeast-2 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId'
```

Result: `___________________`

### Step 2: Tentukan Source untuk Inbound Rule

#### Option A: Allow dari EC2 instance saja (Recommended)
1. [ ] Dapatkan EC2 Security Group ID:
   ```bash
   aws ec2 describe-instances \
     --instance-ids $(ec2-metadata --instance-id | cut -d' ' -f2) \
     --region ap-southeast-2 \
     --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId'
   ```
   EC2 Security Group: `___________________`

2. [ ] Lanjut ke **Step 3A**

#### Option B: Allow dari mana saja (Development Only)
- [ ] Gunakan CIDR: `0.0.0.0/0`
- [ ] ⚠️ **JANGAN gunakan ini untuk production!**
- [ ] Lanjut ke **Step 3B**

### Step 3A: Tambah Rule via GUI (EC2 Only)

1. [ ] Buka https://console.aws.amazon.com/ec2/
2. [ ] Klik "Security Groups" di menu kiri
3. [ ] Cari security group RDS dari Step 1
4. [ ] Klik security group ID
5. [ ] Scroll ke "Inbound rules"
6. [ ] Klik "Edit inbound rules"
7. [ ] Klik "Add rule"
8. [ ] Isi:
   - **Type**: PostgreSQL (atau TCP)
   - **Protocol**: TCP
   - **Port range**: 5432
   - **Source type**: Security group
   - **Source**: Masukkan EC2 Security Group ID dari Step 2
9. [ ] Klik "Save rules"
10. [ ] Status akan berubah ke "pending" kemudian "✓" (tunggu ~30 detik)

### Step 3B: Tambah Rule via GUI (Public Access)

1. [ ] Buka https://console.aws.amazon.com/ec2/
2. [ ] Klik "Security Groups" di menu kiri
3. [ ] Cari security group RDS dari Step 1
4. [ ] Klik security group ID
5. [ ] Scroll ke "Inbound rules"
6. [ ] Klik "Edit inbound rules"
7. [ ] Klik "Add rule"
8. [ ] Isi:
   - **Type**: PostgreSQL (atau TCP)
   - **Protocol**: TCP
   - **Port range**: 5432
   - **Source type**: Custom
   - **Source**: 0.0.0.0/0
9. [ ] Klik "Save rules"
10. [ ] Status akan berubah ke "pending" kemudian "✓" (tunggu ~30 detik)

### Step 3C: Tambah Rule via AWS CLI

```bash
# Untuk EC2 Security Group source
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SECURITY_GROUP> \
  --protocol tcp \
  --port 5432 \
  --source-group <EC2_SECURITY_GROUP> \
  --region ap-southeast-2

# Atau untuk public access (0.0.0.0/0)
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SECURITY_GROUP> \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region ap-southeast-2
```

- [ ] Rule berhasil ditambahkan (check)

### Step 4: Verifikasi Rules

```bash
aws ec2 describe-security-groups \
  --group-ids <RDS_SECURITY_GROUP> \
  --region ap-southeast-2 \
  --query 'SecurityGroups[0].IpPermissions'
```

- [ ] Pastikan port 5432 ada dalam list dengan source yang benar

### Step 5: Test Koneksi

```bash
# Test dari terminal
node test-postgres-connection.js
```

Expected output:
```
✅ Connection successful!
📊 Server info:
   Time: ...
   Version: PostgreSQL ...
```

- [ ] Koneksi berhasil

## ✅ Completion Checklist

- [ ] Security Group Rule ditambahkan
- [ ] Rule sudah aktif (30 detik)
- [ ] Test koneksi berhasil
- [ ] Siap menjalankan aplikasi

## 🚀 Next Steps

Setelah test koneksi berhasil:

```bash
# Install dependencies
yarn install

# Jalankan aplikasi
yarn start

# Atau dengan PM2
yarn start:pm2
```

## 🆘 Jika Masih Error

### ETIMEDOUT error masih terjadi setelah setup?

1. [ ] Tunggu beberapa menit (AWS butuh waktu untuk propagate)
2. [ ] Refresh AWS Console dan verifikasi rule sudah ada
3. [ ] Cek apakah EC2 dan RDS di VPC yang sama
4. [ ] Cek apakah RDS status "available" (bukan "creating")
5. [ ] Coba dengan public CIDR `0.0.0.0/0` untuk testing

### Authentication error?

```
FATAL: password authentication failed
```

- [ ] Verifikasi password: `Veth0581!`
- [ ] Pastikan user: `postgres`
- [ ] Cek di RDS Console bahwa master password belum berubah

### Database tidak ditemukan?

```
FATAL: database "violet" does not exist
```

- [ ] Buat database:
```bash
psql -h violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com \
     -U postgres \
     -c "CREATE DATABASE violet;"
```

- [ ] Atau dari AWS Console → Query editor

## 📞 Support

Lihat dokumentasi detail di:
- `AWS_RDS_SETUP.md` - Setup guide lengkap
- `POSTGRES_AWS_SETUP_SUMMARY.md` - Summary dan troubleshooting

---

**Checklist ini selesai ketika test koneksi berhasil ✅**
