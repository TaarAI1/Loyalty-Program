CREATE TABLE "oracle_config" (
  "id"             INTEGER      NOT NULL DEFAULT 1,
  "host"           TEXT         NOT NULL DEFAULT '',
  "port"           INTEGER      NOT NULL DEFAULT 1521,
  "db_user"        TEXT         NOT NULL DEFAULT '',
  "password"       TEXT         NOT NULL DEFAULT '',
  "service"        TEXT         NOT NULL DEFAULT '',
  "subsidiary_sid" TEXT,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oracle_config_pkey" PRIMARY KEY ("id")
);
