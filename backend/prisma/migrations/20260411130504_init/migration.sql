-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "rank" TEXT,
    "parent_id" INTEGER,
    "agency_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ctv_hierarchy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ctv_id" INTEGER NOT NULL,
    "manager_id" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "appointed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ctv_hierarchy_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ctv_hierarchy_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deposit_amount" REAL NOT NULL,
    "deposit_tier" TEXT NOT NULL,
    "address" TEXT,
    CONSTRAINT "agencies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "commission_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tier" TEXT NOT NULL,
    "self_sale_pct" REAL NOT NULL,
    "f1_pct" REAL NOT NULL,
    "f2_pct" REAL NOT NULL,
    "f3_pct" REAL NOT NULL,
    "fixed_salary" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "agency_commission_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group" TEXT NOT NULL,
    "commission_pct" REAL NOT NULL,
    "bonus_pct" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "cogs_pct" REAL NOT NULL,
    "unit" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kiotviet_order_id" TEXT,
    "customer_id" INTEGER,
    "ctv_id" INTEGER,
    "agency_id" INTEGER,
    "channel" TEXT NOT NULL,
    "total_amount" REAL NOT NULL,
    "cogs_amount" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" REAL NOT NULL,
    "total_price" REAL NOT NULL,
    CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transaction_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "ctv_id" INTEGER,
    "agency_id" INTEGER,
    "first_purchase" DATETIME,
    "total_spent" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "customers_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "customers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kpi_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ctv_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "self_sales" INTEGER NOT NULL,
    "portfolio_size" INTEGER NOT NULL,
    "rank_before" TEXT NOT NULL,
    "rank_after" TEXT NOT NULL,
    CONSTRAINT "kpi_logs_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rank_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ctv_id" INTEGER NOT NULL,
    "old_rank" TEXT NOT NULL,
    "new_rank" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT NOT NULL,
    CONSTRAINT "rank_history_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_warnings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "agency_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "expiry_date" DATETIME NOT NULL,
    "warning_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_warnings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_warnings_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "records_synced" INTEGER NOT NULL,
    "synced_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_user_id_key" ON "agencies"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_config_tier_key" ON "commission_config"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "agency_commission_config_group_key" ON "agency_commission_config"("group");
