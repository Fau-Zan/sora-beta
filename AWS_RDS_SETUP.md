# Konfigurasi PostgreSQL AWS RDS untuk Violet Bot

## Status Koneksi

✅ File `.env` sudah dikonfigurasi dengan kredensial AWS RDS Anda:
- **Host**: violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com
- **Port**: 5432
- **User**: postgres
- **Database**: violet
- **Region**: ap-southeast-2 (Sydney)

❌ Saat ini ada masalah koneksi jaringan (ETIMEDOUT) - ini adalah masalah **Security Group** di AWS.

## Troubleshooting: Mengatur Security Group AWS RDS

### Masalah:
```
Error: connect ETIMEDOUT 172.31.6.46:5432
```

Ini berarti EC2 instance Anda tidak bisa terhubung ke RDS database. Penyebabnya adalah security group yang tidak mengizinkan koneksi.

### Solusi:

#### Step 1: Tentukan VPC dan Subnet
```bash
# Cek VPC info dari EC2
curl http://169.254.169.254/latest/meta-data/mac
curl http://169.254.169.254/latest/meta-data/network/interfaces/macs/
```

#### Step 2: Di AWS Console, Buka RDS Database

1. Buka https://console.aws.amazon.com/rds/
2. Pilih **Databases** di menu kiri
3. Cari database `violet`
4. Buka tab **Connectivity & security**
5. Lihat **VPC security groups** - catat security group ID (misal: `sg-xxxxxxxx`)

#### Step 3: Edit Security Group RDS

1. Buka https://console.aws.amazon.com/ec2/
2. Pilih **Security Groups** di menu kiri
3. Cari security group dari RDS (dari Step 2)
4. Edit **Inbound rules**
5. Tambahkan rule baru:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: 
     - Pilih security group dari EC2 instance Anda (untuk production)
     - Atau `0.0.0.0/0` (untuk development saja, TIDAK untuk production!)

6. Klik **Save rules**

#### Step 4 (Alternatif): Menggunakan AWS CLI

```bash
# Dapatkan security group RDS
aws rds describe-db-instances \
  --db-instance-identifier violet \
  --region ap-southeast-2 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text

# Dapatkan security group EC2
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxx \
  --region ap-southeast-2 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text

# Tambahkan inbound rule ke RDS security group
# Ganti sg-rds-xxxxx dan sg-ec2-xxxxx dengan nilai real
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-xxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ec2-xxxxx \
  --region ap-southeast-2
```

#### Step 5: Test Koneksi Lagi

Setelah security group dikonfigurasi, tunggu beberapa detik kemudian test:

```bash
# Test dengan script
node test-postgres-connection.js

# Atau dengan psql
psql -h violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com \
     -U postgres \
     -d violet \
     -c "SELECT NOW();"
```

## Konfigurasi Environment Variable

File `.env` sudah siap:

```env
POSTGRES_URL=postgresql://postgres:Veth0581!@violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com:5432/violet
```

## Menjalankan Aplikasi

Setelah security group dikonfigurasi:

```bash
# Install dependencies (jika belum)
yarn install

# Test koneksi
node test-postgres-connection.js

# Jalankan aplikasi
yarn start
```

## Catatan Penting

1. **Password di .env**: File `.env` sudah di-gitignore, tapi jangan commit ke git!
   ```bash
   # Pastikan .env dalam .gitignore
   echo ".env" >> .gitignore
   ```

2. **SSL Connection** (Optional tapi recommended untuk production):
   ```env
   POSTGRES_URL=postgresql://postgres:Veth0581!@violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com:5432/violet?sslmode=require
   ```

3. **AWS RDS Endpoint** bisa berubah jika di-restart. Selalu gunakan endpoint dari AWS Console yang terbaru.

4. **Region**: Database Anda di ap-southeast-2 (Sydney). Pastikan EC2 juga di region yang sama untuk latency minimal.

## Useful AWS Commands

```bash
# List RDS instances
aws rds describe-db-instances --region ap-southeast-2

# Cek security group
aws ec2 describe-security-groups --group-ids sg-xxxxxxxx --region ap-southeast-2

# Cek VPC
aws ec2 describe-vpcs --region ap-southeast-2
```

## Jika Masih Gagal

1. Pastikan EC2 dan RDS di VPC yang sama
2. Pastikan RDS tidak set ke "Publicly accessible: No" (untuk development bisa di-set Yes)
3. Cek AWS RDS status - harus "available" bukan "creating" atau "deleting"
4. Cek CloudWatch logs di AWS Console untuk error detail

## Resources

- [AWS RDS Security Groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurity.html)
- [VPC Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [PostgreSQL Connection String](https://www.postgresql.org/docs/current/libpq-connect.html)
