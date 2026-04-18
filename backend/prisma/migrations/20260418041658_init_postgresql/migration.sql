-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "rank" TEXT,
    "parent_id" INTEGER,
    "agency_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_business_household" BOOLEAN NOT NULL DEFAULT false,
    "kyc_status" TEXT NOT NULL DEFAULT 'PENDING',
    "kyc_submitted_at" TIMESTAMP(3),
    "kyc_verified_at" TIMESTAMP(3),
    "kyc_reject_reason" TEXT,
    "id_number" TEXT,
    "id_front_image" TEXT,
    "id_back_image" TEXT,
    "kyc_method" TEXT NOT NULL DEFAULT 'AUTO',
    "kyc_manual_note" TEXT,
    "kyc_verified_by" INTEGER,
    "kyc_device_id" TEXT,
    "kyc_ip_address" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ctv_hierarchy" (
    "id" SERIAL NOT NULL,
    "ctv_id" INTEGER NOT NULL,
    "manager_id" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "appointed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ctv_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deposit_amount" DECIMAL(15,0) NOT NULL,
    "deposit_tier" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_config" (
    "id" SERIAL NOT NULL,
    "tier" TEXT NOT NULL,
    "self_sale_pct" DECIMAL(5,4) NOT NULL,
    "direct_pct" DECIMAL(5,4) NOT NULL,
    "indirect2_pct" DECIMAL(5,4) NOT NULL,
    "indirect3_pct" DECIMAL(5,4) NOT NULL,
    "fixed_salary" DECIMAL(15,0) NOT NULL,

    CONSTRAINT "commission_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_commission_config" (
    "id" SERIAL NOT NULL,
    "group" TEXT NOT NULL,
    "commission_pct" DECIMAL(5,4) NOT NULL,
    "bonus_pct" DECIMAL(5,4) NOT NULL,

    CONSTRAINT "agency_commission_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(15,0) NOT NULL,
    "cogs_pct" DECIMAL(5,4) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "kiotviet_order_id" TEXT,
    "customer_id" INTEGER,
    "ctv_id" INTEGER,
    "agency_id" INTEGER,
    "channel" TEXT NOT NULL,
    "total_amount" DECIMAL(15,0) NOT NULL,
    "cogs_amount" DECIMAL(15,0) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "payment_method" TEXT,
    "bank_code" TEXT,
    "qr_code_data" TEXT,
    "bank_reference" TEXT,
    "ctv_submitted_at" TIMESTAMP(3),
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "cash_deposit_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(15,0) NOT NULL,
    "total_price" DECIMAL(15,0) NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "ctv_id" INTEGER,
    "agency_id" INTEGER,
    "first_purchase" TIMESTAMP(3),
    "total_spent" DECIMAL(15,0) NOT NULL DEFAULT 0,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_logs" (
    "id" SERIAL NOT NULL,
    "ctv_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "self_sales" INTEGER NOT NULL,
    "portfolio_size" INTEGER NOT NULL,
    "rank_before" TEXT NOT NULL,
    "rank_after" TEXT NOT NULL,

    CONSTRAINT "kpi_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rank_history" (
    "id" SERIAL NOT NULL,
    "ctv_id" INTEGER NOT NULL,
    "old_rank" TEXT NOT NULL,
    "new_rank" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT NOT NULL,

    CONSTRAINT "rank_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_warnings" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "agency_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "warning_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "records_synced" INTEGER NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_deposits" (
    "id" SERIAL NOT NULL,
    "ctv_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "transaction_ids" TEXT NOT NULL,
    "deposited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "cash_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_config" (
    "id" SERIAL NOT NULL,
    "rank" TEXT NOT NULL,
    "min_self_combo" INTEGER NOT NULL,
    "min_portfolio" INTEGER NOT NULL,
    "fallback_rank" TEXT NOT NULL,

    CONSTRAINT "kpi_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cogs_config" (
    "id" SERIAL NOT NULL,
    "phase" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cogs_pct" DECIMAL(5,4) NOT NULL,
    "description" TEXT,

    CONSTRAINT "cogs_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_tiers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "min_deposit" DECIMAL(15,0) NOT NULL,
    "discount_pct" DECIMAL(5,4) NOT NULL,
    "referral_pct" DECIMAL(5,4) NOT NULL,
    "monthly_referral_cap" DECIMAL(15,0) NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "tier_id" INTEGER NOT NULL,
    "balance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_deposit" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "referral_code" TEXT NOT NULL,
    "referred_by_id" INTEGER,
    "referral_earned" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "monthly_referral_earned" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_history" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "provider_tx_id" TEXT,
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_commissions" (
    "id" SERIAL NOT NULL,
    "earner_wallet_id" INTEGER NOT NULL,
    "source_wallet_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "rate_pct" DECIMAL(5,4) NOT NULL,
    "month" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "success_rows" INTEGER NOT NULL,
    "failed_rows" INTEGER NOT NULL,
    "imported_by" INTEGER NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_eligibility" (
    "id" SERIAL NOT NULL,
    "ctv_id" INTEGER NOT NULL,
    "target_rank" TEXT NOT NULL,
    "qualified_month" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_bonuses" (
    "id" SERIAL NOT NULL,
    "ctv_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "direct_member_count" INTEGER NOT NULL,
    "team_revenue" DECIMAL(15,0) NOT NULL,
    "bonus_rate" DECIMAL(5,4) NOT NULL,
    "bonus_amount" DECIMAL(15,0) NOT NULL,
    "cash_amount" DECIMAL(15,0) NOT NULL,
    "point_amount" DECIMAL(15,0) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_points" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "reference_id" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_titles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "direct_count" INTEGER NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewed_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "professional_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_config" (
    "id" SERIAL NOT NULL,
    "tier" TEXT NOT NULL,
    "min_combo" INTEGER NOT NULL,
    "max_combo" INTEGER,
    "fee_amount" DECIMAL(15,0) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_households" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "business_name" TEXT NOT NULL,
    "tax_code" TEXT,
    "business_license" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dealer_contract_no" TEXT,
    "dealer_signed_at" TIMESTAMP(3),
    "dealer_expired_at" TIMESTAMP(3),
    "dealer_term_months" INTEGER DEFAULT 12,
    "dealer_pdf_url" TEXT,
    "training_contract_no" TEXT,
    "training_signed_at" TIMESTAMP(3),
    "training_expired_at" TIMESTAMP(3),
    "training_term_months" INTEGER DEFAULT 12,
    "training_pdf_url" TEXT,
    "bank_name" TEXT,
    "bank_account_no" TEXT,
    "bank_account_holder" TEXT,
    "training_line_registered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_contracts" (
    "id" SERIAL NOT NULL,
    "contract_no" TEXT NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "trainee_id" INTEGER NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "terminated_at" TIMESTAMP(3),
    "termination_reason" TEXT,
    "terminated_by" INTEGER,

    CONSTRAINT "b2b_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_logs" (
    "id" SERIAL NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "trainee_id" INTEGER NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "mentee_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "mentor_confirmed" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_sent_at" TIMESTAMP(3),
    "otp_sent_method" TEXT,
    "otp_retry_count" INTEGER NOT NULL DEFAULT 0,
    "otp_fail_count" INTEGER NOT NULL DEFAULT 0,
    "otp_blocked_until" TIMESTAMP(3),
    "admin_verified" BOOLEAN NOT NULL DEFAULT false,
    "admin_verified_by" INTEGER,
    "admin_verified_at" TIMESTAMP(3),

    CONSTRAINT "training_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "fee_tier" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdf_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "external_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "manual_issued" BOOLEAN NOT NULL DEFAULT false,
    "issued_by" INTEGER,
    "issued_at_manual" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_transfer_logs" (
    "id" SERIAL NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "transfer_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retry" INTEGER NOT NULL DEFAULT 3,
    "last_retry_at" TIMESTAMP(3),
    "manual_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "admin_note" TEXT,

    CONSTRAINT "auto_transfer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_records" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "taxable_income" DECIMAL(15,0) NOT NULL,
    "tax_amount" DECIMAL(15,0) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_fees" (
    "id" SERIAL NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "management_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breakaway_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "old_parent_id" INTEGER NOT NULL,
    "new_parent_id" INTEGER NOT NULL,
    "breakaway_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "breakaway_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breakaway_fees" (
    "id" SERIAL NOT NULL,
    "breakaway_log_id" INTEGER NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breakaway_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" INTEGER,
    "old_value" TEXT,
    "new_value" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_manual_actions" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" INTEGER NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_manual_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_number_key" ON "users"("id_number");

-- CreateIndex
CREATE INDEX "users_parent_id_idx" ON "users"("parent_id");

-- CreateIndex
CREATE INDEX "users_rank_idx" ON "users"("rank");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_user_id_key" ON "agencies"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_config_tier_key" ON "commission_config"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "agency_commission_config_group_key" ON "agency_commission_config"("group");

-- CreateIndex
CREATE INDEX "transactions_ctv_id_idx" ON "transactions"("ctv_id");

-- CreateIndex
CREATE INDEX "transactions_agency_id_idx" ON "transactions"("agency_id");

-- CreateIndex
CREATE INDEX "transactions_channel_idx" ON "transactions"("channel");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_ctv_id_status_idx" ON "transactions"("ctv_id", "status");

-- CreateIndex
CREATE INDEX "transactions_ctv_id_created_at_idx" ON "transactions"("ctv_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_agency_id_created_at_idx" ON "transactions"("agency_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_channel_created_at_idx" ON "transactions"("channel", "created_at");

-- CreateIndex
CREATE INDEX "transaction_items_transaction_id_idx" ON "transaction_items"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_items_product_id_idx" ON "transaction_items"("product_id");

-- CreateIndex
CREATE INDEX "kpi_logs_month_idx" ON "kpi_logs"("month");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_logs_ctv_id_month_key" ON "kpi_logs"("ctv_id", "month");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_proofs_transaction_id_key" ON "payment_proofs"("transaction_id");

-- CreateIndex
CREATE INDEX "cash_deposits_ctv_id_idx" ON "cash_deposits"("ctv_id");

-- CreateIndex
CREATE INDEX "cash_deposits_status_idx" ON "cash_deposits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_config_rank_key" ON "kpi_config"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "cogs_config_phase_key" ON "cogs_config"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "membership_tiers_name_key" ON "membership_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "member_wallets_user_id_key" ON "member_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_wallets_customer_id_key" ON "member_wallets"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_wallets_referral_code_key" ON "member_wallets"("referral_code");

-- CreateIndex
CREATE INDEX "member_wallets_referral_code_idx" ON "member_wallets"("referral_code");

-- CreateIndex
CREATE INDEX "member_wallets_tier_id_idx" ON "member_wallets"("tier_id");

-- CreateIndex
CREATE INDEX "deposit_history_wallet_id_idx" ON "deposit_history"("wallet_id");

-- CreateIndex
CREATE INDEX "deposit_history_status_idx" ON "deposit_history"("status");

-- CreateIndex
CREATE INDEX "referral_commissions_earner_wallet_id_idx" ON "referral_commissions"("earner_wallet_id");

-- CreateIndex
CREATE INDEX "referral_commissions_month_idx" ON "referral_commissions"("month");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_titles_user_id_key" ON "professional_titles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_config_tier_key" ON "fee_config"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "business_households_user_id_key" ON "business_households"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_contracts_contract_no_key" ON "b2b_contracts"("contract_no");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_from_user_id_idx" ON "invoices"("from_user_id");

-- CreateIndex
CREATE INDEX "invoices_to_user_id_idx" ON "invoices"("to_user_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "auto_transfer_logs_from_user_id_idx" ON "auto_transfer_logs"("from_user_id");

-- CreateIndex
CREATE INDEX "auto_transfer_logs_status_idx" ON "auto_transfer_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_records_user_id_month_key" ON "tax_records"("user_id", "month");

-- CreateIndex
CREATE INDEX "management_fees_to_user_id_month_idx" ON "management_fees"("to_user_id", "month");

-- CreateIndex
CREATE INDEX "management_fees_from_user_id_month_idx" ON "management_fees"("from_user_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "breakaway_logs_user_id_key" ON "breakaway_logs"("user_id");

-- CreateIndex
CREATE INDEX "breakaway_logs_status_expire_at_idx" ON "breakaway_logs"("status", "expire_at");

-- CreateIndex
CREATE INDEX "breakaway_logs_old_parent_id_idx" ON "breakaway_logs"("old_parent_id");

-- CreateIndex
CREATE INDEX "breakaway_logs_new_parent_id_idx" ON "breakaway_logs"("new_parent_id");

-- CreateIndex
CREATE INDEX "breakaway_logs_status_idx" ON "breakaway_logs"("status");

-- CreateIndex
CREATE INDEX "breakaway_fees_to_user_id_month_idx" ON "breakaway_fees"("to_user_id", "month");

-- CreateIndex
CREATE INDEX "breakaway_fees_breakaway_log_id_month_idx" ON "breakaway_fees"("breakaway_log_id", "month");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "admin_manual_actions_admin_id_idx" ON "admin_manual_actions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_manual_actions_action_type_idx" ON "admin_manual_actions"("action_type");

-- CreateIndex
CREATE INDEX "admin_manual_actions_target_type_target_id_idx" ON "admin_manual_actions"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ctv_hierarchy" ADD CONSTRAINT "ctv_hierarchy_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ctv_hierarchy" ADD CONSTRAINT "ctv_hierarchy_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cash_deposit_id_fkey" FOREIGN KEY ("cash_deposit_id") REFERENCES "cash_deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_logs" ADD CONSTRAINT "kpi_logs_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_history" ADD CONSTRAINT "rank_history_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_warnings" ADD CONSTRAINT "inventory_warnings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_warnings" ADD CONSTRAINT "inventory_warnings_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "membership_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "member_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_history" ADD CONSTRAINT "deposit_history_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "member_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_earner_wallet_id_fkey" FOREIGN KEY ("earner_wallet_id") REFERENCES "member_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_source_wallet_id_fkey" FOREIGN KEY ("source_wallet_id") REFERENCES "member_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_eligibility" ADD CONSTRAINT "promotion_eligibility_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_bonuses" ADD CONSTRAINT "team_bonuses_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_titles" ADD CONSTRAINT "professional_titles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_households" ADD CONSTRAINT "business_households_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_contracts" ADD CONSTRAINT "b2b_contracts_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_contracts" ADD CONSTRAINT "b2b_contracts_trainee_id_fkey" FOREIGN KEY ("trainee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_trainee_id_fkey" FOREIGN KEY ("trainee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "b2b_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_transfer_logs" ADD CONSTRAINT "auto_transfer_logs_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_transfer_logs" ADD CONSTRAINT "auto_transfer_logs_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_records" ADD CONSTRAINT "tax_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_fees" ADD CONSTRAINT "management_fees_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_fees" ADD CONSTRAINT "management_fees_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakaway_logs" ADD CONSTRAINT "breakaway_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakaway_logs" ADD CONSTRAINT "breakaway_logs_old_parent_id_fkey" FOREIGN KEY ("old_parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakaway_logs" ADD CONSTRAINT "breakaway_logs_new_parent_id_fkey" FOREIGN KEY ("new_parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakaway_fees" ADD CONSTRAINT "breakaway_fees_breakaway_log_id_fkey" FOREIGN KEY ("breakaway_log_id") REFERENCES "breakaway_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakaway_fees" ADD CONSTRAINT "breakaway_fees_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breakaway_fees" ADD CONSTRAINT "breakaway_fees_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
