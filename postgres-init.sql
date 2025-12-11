-- SQL Setup Script untuk PostgreSQL Database
-- Jalankan script ini untuk membuat database dan user untuk aplikasi

-- 1. Buat Database
CREATE DATABASE violet
    ENCODING 'UTF8'
    LOCALE 'en_US.UTF-8';

-- 2. Buat User (ganti password dengan password yang aman)
CREATE USER violet_user WITH PASSWORD 'Velezard';

-- 3. Grant Privileges
GRANT CONNECT ON DATABASE violet TO violet_user;
GRANT USAGE ON SCHEMA public TO violet_user;
GRANT CREATE ON SCHEMA public TO violet_user;

-- Connect to violet database
\c violet

-- 4. Grant default privileges untuk tables yang akan dibuat
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO violet_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO violet_user;

-- 5. Buat extension jika diperlukan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
