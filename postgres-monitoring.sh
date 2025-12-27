#!/bin/bash


DB_NAME="violetdb"
DB_USER="postgres"
DB_HOST="violetdb.cxm64ioi4d1f.ap-southeast-2.rds.amazonaws.com"
DB_PORT="5432"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

execute_query() {
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "$1"
}

show_main_menu() {
    clear
    print_header "PostgreSQL Monitoring Tool - violetdb"
    
    echo "Pilih opsi:"
    echo "1. Database Information"
    echo "2. Tables & Columns"
    echo "3. Users & Permissions"
    echo "4. Performance Monitoring"
    echo "5. Maintenance"
    echo "6. CRUD Operations"
    echo "7. Connections & Activity"
    echo "8. WA Auth Monitoring"
    echo "9. Settings"
    echo "10. Keluar"
    echo ""
    read -p "Pilih menu (1-10): " menu_choice
}

menu_database_info() {
    clear
    print_header "1. DATABASE INFORMATION"
    
    echo -e "${YELLOW}List semua database:${NC}"
    execute_query "SELECT datname AS \"Database\", 
       pg_size_pretty(pg_database_size(datname)) AS \"Size\",
       usename AS \"Owner\"
FROM pg_database
LEFT JOIN pg_user ON pg_database.datdba = pg_user.usesysid
ORDER BY datname;"
    
    echo ""
    echo -e "${YELLOW}Detail database 'violet':${NC}"
    execute_query "SELECT datname, 
       spcname, 
       pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
JOIN pg_tablespace ON pg_database.dattablespace = pg_tablespace.oid
WHERE datname = 'violet';"
    
    pause_menu
}

menu_tables() {
    clear
    print_header "2. TABLES & COLUMNS"
    
    echo -e "${YELLOW}List semua tables dengan size:${NC}"
    execute_query "SELECT table_schema,
       table_name,
       pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) AS \"Table Size\"
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;"
    
    echo ""
    echo -e "${YELLOW}Structure table (columns):${NC}"
    execute_query "SELECT table_name, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;"
    
    echo ""
    echo -e "${YELLOW}Indexes:${NC}"
    execute_query "SELECT table_name,
       indexname,
       indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY table_name, indexname;"
    
    pause_menu
}

menu_users() {
    clear
    print_header "3. USERS & PERMISSIONS"
    
    echo -e "${YELLOW}List users/roles:${NC}"
    execute_query "SELECT usename,
       usesuper AS \"Super\",
       usecreatedb AS \"Create DB\",
       usecreaterole AS \"Create Role\",
       usecanlogin AS \"Can Login\"
FROM pg_user
ORDER BY usename;"
    
    echo ""
    echo -e "${YELLOW}Role membership:${NC}"
    execute_query "SELECT r.rolname, ARRAY_AGG(m.rolname) as members
FROM pg_roles r
LEFT JOIN pg_roles m ON r.oid = ANY(m.memberof)
WHERE r.rolname NOT LIKE 'pg_%'
GROUP BY r.rolname
ORDER BY r.rolname;"
    
    pause_menu
}

menu_performance() {
    clear
    print_header "4. PERFORMANCE MONITORING"
    
    echo "Pilih opsi:"
    echo "1. Ukuran database"
    echo "2. Table terbesar (top 10)"
    echo "3. Cache hit ratio"
    echo "4. Unused indexes"
    echo "5. Dead tuples"
    echo "6. Kembali"
    read -p "Pilih (1-6): " perf_choice
    
    case $perf_choice in
        1)
            clear
            print_header "Ukuran Database"
            execute_query "SELECT datname,
       pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname NOT IN ('template0', 'template1', 'postgres')
ORDER BY pg_database_size(datname) DESC;"
            ;;
        2)
            clear
            print_header "Table Terbesar (Top 10)"
            execute_query "SELECT schemaname,
       tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"
            ;;
        3)
            clear
            print_header "Cache Hit Ratio (Target > 99%)"
            execute_query "SELECT
    datname,
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    ROUND(sum(heap_blks_hit) * 100.0 / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) as ratio
FROM pg_statio_user_tables
GROUP BY datname;"
            ;;
        4)
            clear
            print_header "Unused Indexes"
            execute_query "SELECT schemaname,
       tablename,
       indexname,
       idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename;"
            ;;
        5)
            clear
            print_header "Dead Tuples"
            execute_query "SELECT schemaname,
       tablename,
       n_dead_tup,
       n_live_tup,
       ROUND(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables
WHERE (n_live_tup + n_dead_tup) > 0
ORDER BY dead_ratio DESC;"
            ;;
    esac
    
    pause_menu
}

menu_maintenance() {
    clear
    print_header "5. MAINTENANCE"
    
    echo "Pilih opsi:"
    echo "1. Last vacuum/analyze"
    echo "2. Vacuum optimize"
    echo "3. Reindex database"
    echo "4. Kembali"
    read -p "Pilih (1-4): " maint_choice
    
    case $maint_choice in
        1)
            clear
            print_header "Last Vacuum/Analyze"
            execute_query "SELECT schemaname,
       tablename,
       last_vacuum,
       last_autovacuum,
       last_analyze,
       last_autoanalyze
FROM pg_stat_user_tables
ORDER BY tablename;"
            ;;
        2)
            clear
            print_header "Vacuum Optimize"
            echo -e "${YELLOW}Jalankan VACUUM ANALYZE? (y/n)${NC}"
            read -p "> " vacuum_confirm
            if [ "$vacuum_confirm" = "y" ] || [ "$vacuum_confirm" = "Y" ]; then
                execute_query "VACUUM ANALYZE;"
                print_success "VACUUM ANALYZE selesai!"
            fi
            ;;
        3)
            clear
            print_header "Reindex Database"
            echo -e "${YELLOW}Jalankan REINDEX? (y/n)${NC}"
            read -p "> " reindex_confirm
            if [ "$reindex_confirm" = "y" ] || [ "$reindex_confirm" = "Y" ]; then
                execute_query "REINDEX DATABASE $DB_NAME;"
                print_success "REINDEX selesai!"
            fi
            ;;
    esac
    
    pause_menu
}

menu_crud() {
    clear
    print_header "6. CRUD OPERATIONS"
    
    echo "Pilih opsi:"
    echo "1. Select (Read) Data"
    echo "2. Insert (Create) Data"
    echo "3. Update Data"
    echo "4. Delete Data"
    echo "5. Kembali"
    read -p "Pilih (1-5): " crud_choice
    
    case $crud_choice in
        1)
            clear
            print_header "SELECT (Read) Data"
            read -p "Masukkan table name: " table_name
            read -p "Masukkan WHERE clause (kosongkan untuk all): " where_clause
            
            if [ -z "$where_clause" ]; then
                execute_query "SELECT * FROM $table_name LIMIT 10;"
            else
                execute_query "SELECT * FROM $table_name WHERE $where_clause LIMIT 10;"
            fi
            ;;
        2)
            clear
            print_header "INSERT (Create) Data"
            read -p "Masukkan table name: " table_name
            read -p "Masukkan columns (comma-separated): " columns
            read -p "Masukkan values (comma-separated): " values
            execute_query "INSERT INTO $table_name ($columns) VALUES ($values) RETURNING *;"
            ;;
        3)
            clear
            print_header "UPDATE Data"
            read -p "Masukkan table name: " table_name
            read -p "Masukkan SET clause (e.g., col1=val1, col2=val2): " set_clause
            read -p "Masukkan WHERE clause: " where_clause
            execute_query "UPDATE $table_name SET $set_clause WHERE $where_clause RETURNING *;"
            ;;
        4)
            clear
            print_header "DELETE Data"
            read -p "Masukkan table name: " table_name
            read -p "Masukkan WHERE clause: " where_clause
            echo -e "${RED}PERINGATAN: Anda akan menghapus data!${NC}"
            read -p "Lanjutkan? (y/n): " delete_confirm
            if [ "$delete_confirm" = "y" ] || [ "$delete_confirm" = "Y" ]; then
                execute_query "DELETE FROM $table_name WHERE $where_clause;"
                print_success "Data dihapus!"
            fi
            ;;
    esac
    
    pause_menu
}

# 7. Connections & Activity
menu_connections() {
    clear
    print_header "7. CONNECTIONS & ACTIVITY"
    
    echo -e "${YELLOW}Active connections:${NC}"
    execute_query "SELECT pid,
       usename,
       application_name,
       client_addr,
       backend_start,
       query_start,
       state
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
ORDER BY backend_start DESC;"
    
    echo ""
    echo -e "${YELLOW}Long-running queries (> 5 menit):${NC}"
    execute_query "SELECT pid,
       usename,
       query,
       query_start,
       NOW() - query_start AS \"Running Time\"
FROM pg_stat_activity
WHERE (NOW() - query_start) > interval '5 minutes'
ORDER BY query_start;"
    
    echo ""
    echo -e "${YELLOW}Locks:${NC}"
    execute_query "SELECT pid,
       usename,
       pg_blocking_pids(pid) as blocked_by,
       query
FROM pg_stat_activity
WHERE pg_blocking_pids(pid)::text != '{}';"
    
    pause_menu
}

# 8. WA Auth Monitoring
menu_wa_auth() {
    clear
    print_header "8. WA AUTH MONITORING"
    
    echo "Pilih opsi:"
    echo "1. List semua sessions"
    echo "2. Detail session (search by ID)"
    echo "3. Session size & stats"
    echo "4. Export session data"
    echo "5. Delete session"
    echo "6. Kembali"
    read -p "Pilih (1-6): " wa_choice
    
    case $wa_choice in
        1)
            clear
            print_header "List Semua WA Auth Sessions"
            execute_query "SELECT 
    session_id,
    LENGTH(auth)::bigint as auth_size_bytes,
    pg_size_pretty(LENGTH(auth)::bigint) as auth_size,
    created_at,
    updated_at,
    NOW() - updated_at as time_since_update
FROM wa_auth
ORDER BY updated_at DESC;"
            ;;
        2)
            clear
            print_header "Detail Session"
            read -p "Masukkan session ID: " session_id
            echo ""
            echo -e "${YELLOW}Session Data:${NC}"
            execute_query "SELECT 
    session_id,
    LENGTH(auth)::bigint as size_bytes,
    pg_size_pretty(LENGTH(auth)::bigint) as size,
    created_at,
    updated_at
FROM wa_auth
WHERE session_id = '$session_id';"
            
            echo ""
            echo -e "${YELLOW}Auth Keys Info (first 500 chars):${NC}"
            execute_query "SELECT 
    session_id,
    SUBSTRING(auth, 1, 500) as auth_preview
FROM wa_auth
WHERE session_id = '$session_id';"
            ;;
        3)
            clear
            print_header "Session Size & Stats"
            execute_query "SELECT 
    COUNT(*) as total_sessions,
    SUM(LENGTH(auth))::bigint as total_size_bytes,
    pg_size_pretty(SUM(LENGTH(auth))::bigint) as total_size,
    ROUND(AVG(LENGTH(auth)))::bigint as avg_size_bytes,
    pg_size_pretty(ROUND(AVG(LENGTH(auth)))::bigint) as avg_size,
    MAX(LENGTH(auth))::bigint as max_size_bytes,
    pg_size_pretty(MAX(LENGTH(auth))::bigint) as max_size,
    MIN(LENGTH(auth))::bigint as min_size_bytes,
    pg_size_pretty(MIN(LENGTH(auth))::bigint) as min_size
FROM wa_auth;"
            ;;
        4)
            clear
            print_header "Export Session Data"
            read -p "Masukkan session ID (atau kosongkan untuk semua): " export_session
            
            if [ -z "$export_session" ]; then
                echo -e "${YELLOW}Export semua sessions...${NC}"
                PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "COPY wa_auth TO STDOUT;" > wa_auth_export_$(date +%Y%m%d_%H%M%S).sql
            else
                echo -e "${YELLOW}Export session: $export_session${NC}"
                PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "COPY wa_auth TO STDOUT WHERE session_id = '$export_session';" > wa_auth_export_${export_session}_$(date +%Y%m%d_%H%M%S).sql
            fi
            
            print_success "Export selesai!"
            ;;
        5)
            clear
            print_header "Delete Session"
            read -p "Masukkan session ID yang akan dihapus: " delete_session
            echo -e "${RED}PERINGATAN: Anda akan menghapus session $delete_session!${NC}"
            read -p "Lanjutkan? (y/n): " delete_confirm
            
            if [ "$delete_confirm" = "y" ] || [ "$delete_confirm" = "Y" ]; then
                execute_query "DELETE FROM wa_auth WHERE session_id = '$delete_session';"
                print_success "Session $delete_session dihapus!"
            fi
            ;;
    esac
    
    pause_menu
}

# 9. Settings
menu_settings() {
    clear
    print_header "9. SETTINGS"
    
    echo "Database Configuration:"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo ""
    
    echo "Pilih opsi:"
    echo "1. Show PostgreSQL Config"
    echo "2. Show Transaction Isolation Level"
    echo "3. Test Connection"
    echo "4. Kembali"
    read -p "Pilih (1-4): " set_choice
    
    case $set_choice in
        1)
            clear
            print_header "PostgreSQL Configuration"
            execute_query "SELECT name, setting, unit FROM pg_settings WHERE source != 'default' ORDER BY name;"
            ;;
        2)
            clear
            print_header "Transaction Isolation Level"
            execute_query "SHOW TRANSACTION_ISOLATION_LEVEL;"
            ;;
        3)
            clear
            print_header "Testing Connection"
            PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"
            if [ $? -eq 0 ]; then
                print_success "Koneksi berhasil!"
            else
                print_error "Koneksi gagal!"
            fi
            ;;
    esac
    
    pause_menu
}

# Pause menu
pause_menu() {
    echo ""
    read -p "Tekan Enter untuk lanjut..."
}

# Login
login_database() {
    clear
    print_header "PostgreSQL Database Login"
    
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo "Host: $DB_HOST"
    echo "Port: $DB_PORT"
    echo ""
    read -s -p "Masukkan password: " DB_PASS
    export DB_PASS
    
    # Test connection
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Login berhasil!"
        sleep 1
    else
        print_error "Login gagal! Silakan cek password Anda."
        sleep 2
        login_database
    fi
}

# Main loop
main() {
    login_database
    
    while true; do
        show_main_menu
        
        case $menu_choice in
            1) menu_database_info ;;
            2) menu_tables ;;
            3) menu_users ;;
            4) menu_performance ;;
            5) menu_maintenance ;;
            6) menu_crud ;;
            7) menu_connections ;;
            8) menu_wa_auth ;;
            9) menu_settings ;;
            10) 
                clear
                print_success "Terima kasih! Sampai jumpa."
                exit 0
                ;;
            *) 
                print_error "Pilihan tidak valid!"
                sleep 1
                ;;
        esac
    done
}

# Run
main
