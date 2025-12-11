-- SQL Setup Script untuk PostgreSQL Database
-- Jalankan script ini untuk membuat database dan user untuk aplikasi

-- 1. Buat Database
CREATE DATABASE violet
    ENCODING 'UTF8'
    LOCALE 'en_US.UTF-8';

-- 2. Buat User (ganti password dengan password yang aman)
CREATE USER violet_user WITH PASSWORD 'your_secure_password_here';

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

-- Tables akan dibuat otomatis oleh aplikasi saat startup
-- Tapi jika ingin membuat manual, uncomment di bawah:

/*

-- Table untuk WhatsApp Authentication
CREATE TABLE IF NOT EXISTS wa_auth (
    session_id VARCHAR(255) PRIMARY KEY,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_auth_session_id ON wa_auth (session_id);

-- Table untuk WhatsApp Chats/Conversations
CREATE TABLE IF NOT EXISTS wa_chats (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT,
    "unreadCount" INTEGER,
    "lastMessage" TEXT,
    "lastMessageRecvTimestamp" BIGINT,
    "lastMessageSentTimestamp" BIGINT,
    "liveLocationJid" TEXT,
    "isLiveLocationActive" BOOLEAN,
    "conversationTimestamp" BIGINT,
    "muteEndTime" BIGINT,
    "isMuted" BOOLEAN,
    "isMarkedSpam" BOOLEAN,
    "isArchived" BOOLEAN,
    "canFan" BOOLEAN,
    "isPin" BOOLEAN,
    "archive" BOOLEAN,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_chats_id ON wa_chats (id);

-- Table untuk WhatsApp Contacts
CREATE TABLE IF NOT EXISTS wa_contacts (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT,
    notify TEXT,
    "isContact" BOOLEAN,
    "isMyContact" BOOLEAN,
    "isBusiness" BOOLEAN,
    "isEnterprise" BOOLEAN,
    "verifiedName" TEXT,
    "verifiedLevel" TEXT,
    "businessAccountLinkUrl" TEXT,
    "statusMute" TEXT,
    "pictureUrl" TEXT,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_id ON wa_contacts (id);

-- Table untuk WhatsApp Messages
CREATE TABLE IF NOT EXISTS wa_messages (
    "keyId" VARCHAR(255) PRIMARY KEY,
    "remoteJid" VARCHAR(255),
    type TEXT,
    "messageTimestamp" BIGINT,
    message JSONB,
    deleted BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_keyId ON wa_messages ("keyId");
CREATE INDEX IF NOT EXISTS idx_wa_messages_remoteJid ON wa_messages ("remoteJid", "keyId");
CREATE INDEX IF NOT EXISTS idx_wa_messages_timestamp ON wa_messages ("messageTimestamp");

*/

-- Selesai! Database violet telah dikonfigurasi untuk aplikasi Anda.
-- Connection string: postgresql://violet_user:your_secure_password_here@localhost:5432/violet
