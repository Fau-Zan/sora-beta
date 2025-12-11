#!/bin/bash

# Script untuk membantu setup AWS RDS Security Group
# Usage: bash aws-rds-setup.sh

echo "🔧 AWS RDS Security Group Setup Helper"
echo "========================================"
echo ""

# Cek apakah AWS CLI terinstall
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI tidak terinstall. Install terlebih dahulu:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Cek apakah AWS credentials sudah dikonfigurasi
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials tidak dikonfigurasi. Setup terlebih dahulu:"
    echo "   aws configure"
    exit 1
fi

REGION="ap-southeast-2"
DB_INSTANCE="violet"
echo "📍 Region: $REGION"
echo "🗄️  Database: $DB_INSTANCE"
echo ""

# Dapatkan RDS Security Group
echo "🔍 Mengambil informasi RDS..."
RDS_SG=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE \
  --region $REGION \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text 2>/dev/null)

if [ -z "$RDS_SG" ] || [ "$RDS_SG" == "None" ]; then
    echo "❌ Database '$DB_INSTANCE' tidak ditemukan di region $REGION"
    echo "   Pastikan:"
    echo "   1. Database sudah dibuat di AWS RDS"
    echo "   2. Region sudah benar (ap-southeast-2)"
    echo "   3. AWS credentials sudah dikonfigurasi"
    exit 1
fi

echo "✅ RDS Security Group: $RDS_SG"
echo ""

# Menu pilihan
echo "Pilih opsi:"
echo "1) Tambah rule untuk EC2 instance di VPC yang sama"
echo "2) Tambah rule untuk akses publik (0.0.0.0/0)"
echo "3) Lihat current inbound rules"
echo "4) Test koneksi"
echo ""
read -p "Pilih opsi (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Opsi 1: EC2 Instance Security Group"
        echo "Jalankan command ini di EC2 instance Anda untuk dapatkan security group:"
        echo "  aws ec2 describe-instances --instance-ids \$(ec2-metadata --instance-id | cut -d' ' -f2) --region ap-southeast-2 --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text"
        echo ""
        read -p "Masukkan EC2 Security Group ID (sg-xxxxxxxx): " EC2_SG
        
        if [ -z "$EC2_SG" ]; then
            echo "❌ Security Group ID tidak boleh kosong"
            exit 1
        fi
        
        echo ""
        echo "Menambahkan rule untuk $EC2_SG..."
        aws ec2 authorize-security-group-ingress \
          --group-id $RDS_SG \
          --protocol tcp \
          --port 5432 \
          --source-group $EC2_SG \
          --region $REGION && echo "✅ Rule berhasil ditambahkan" || echo "⚠️  Rule sudah ada atau error"
        ;;
    
    2)
        echo ""
        echo "⚠️  PERINGATAN: Ini akan membuka akses dari siapa saja (0.0.0.0/0)"
        echo "   Hanya gunakan untuk development, JANGAN untuk production!"
        echo ""
        read -p "Lanjutkan? (yes/no): " confirm
        
        if [ "$confirm" == "yes" ]; then
            echo "Menambahkan rule untuk 0.0.0.0/0..."
            aws ec2 authorize-security-group-ingress \
              --group-id $RDS_SG \
              --protocol tcp \
              --port 5432 \
              --cidr 0.0.0.0/0 \
              --region $REGION && echo "✅ Rule berhasil ditambahkan" || echo "⚠️  Rule sudah ada atau error"
        fi
        ;;
    
    3)
        echo ""
        echo "📋 Current Inbound Rules untuk $RDS_SG:"
        aws ec2 describe-security-groups \
          --group-ids $RDS_SG \
          --region $REGION \
          --query 'SecurityGroups[0].IpPermissions' \
          --output table
        ;;
    
    4)
        echo ""
        echo "Testing koneksi..."
        if [ -f ".env" ]; then
            node test-postgres-connection.js
        else
            echo "❌ File .env tidak ditemukan"
            exit 1
        fi
        ;;
    
    *)
        echo "❌ Opsi tidak valid"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
