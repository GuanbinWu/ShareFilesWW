set -euo pipefail

# 管理员账号，用来先创建用户和数据库
export PGHOST="localhost"
export PGPORT="5432"
export PGUSER="postgres"
export PGPASSWORD="postgres_admin_password"

DB_USER="mydbuser"
DB_PASS="mypassword"
DB_NAME="mydatabase"

# 1) 创建用户
sudo -u postgres psql  -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
SQL


# 2) 以新用户身份执行建表等操作
export PGUSER="$DB_USER"
export PGPASSWORD="$DB_PASS"

psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'

CREATE TABLE IF NOT EXISTS log (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    file TEXT NOT NULL,
    folder TEXT NOT NULL,
    repo TEXT NOT NULL,
    time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    args TEXT);

CREATE TABLE IF NOT EXISTS repos (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    public BOOLEAN);

CREATE TABLE IF NOT EXISTS folders (
    id   SERIAL NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER NOT NULL,
    repo INTEGER NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 0 AND 9)
);

CREATE TABLE IF NOT EXISTS repouserlevel(
    id SERIAL NOT NULL PRIMARY KEY,
    repo INTEGER NOT NULL,
    userid INTEGER NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 0 AND 9)
    );



CREATE TABLE IF NOT EXISTS files (
    id            SERIAL NOT NULL PRIMARY KEY,
    name          TEXT NOT NULL,
    folder        INTEGER NOT NULL,
    repo          INTEGER NOT NULL,
    size          BIGINT NOT NULL,
    content_type  TEXT NOT NULL,
    md5           TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    creator       TEXT NOT NULL,
    last_modifier TEXT NOT NULL,
    disk_uuid     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_del_records (
    id            SERIAL NOT NULL PRIMARY KEY,
    origin_id     INTEGER NOT NULL,
    name          TEXT NOT NULL,
    folder        INTEGER NOT NULL,
    repo          INTEGER NOT NULL,
    size          BIGINT NOT NULL,
    content_type  TEXT NOT NULL,
    md5           TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    creator       TEXT NOT NULL,
    last_modifier TEXT NOT NULL,
    disk_uuid     TEXT NOT NULL,
    delete_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );


CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    hashed   TEXT NOT NULL
);
SQL