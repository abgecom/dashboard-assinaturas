-- ============================================================================
-- Limpeza de execuções parciais anteriores (seguro: só roda se existir)
-- ============================================================================
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;

-- ============================================================================
-- TABELA: petloo_customers
-- ============================================================================
CREATE TABLE petloo_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_id TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  document TEXT,
  document_type TEXT,
  type TEXT,
  phone TEXT,
  address JSONB,
  metadata JSONB,
  pagarme_created_at TIMESTAMPTZ,
  pagarme_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_petloo_customers_email ON petloo_customers(email);
CREATE INDEX idx_petloo_customers_document ON petloo_customers(document);
CREATE INDEX idx_petloo_customers_pagarme_created_at ON petloo_customers(pagarme_created_at);

-- ============================================================================
-- TABELA: petloo_plans
-- ============================================================================
CREATE TABLE petloo_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_id TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT,
  status TEXT,
  interval TEXT,
  interval_count INTEGER,
  billing_type TEXT,
  payment_methods JSONB,
  installments JSONB,
  items JSONB,
  metadata JSONB,
  pagarme_created_at TIMESTAMPTZ,
  pagarme_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABELA: petloo_subscriptions
-- ============================================================================
CREATE TABLE petloo_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_id TEXT NOT NULL UNIQUE,
  customer_pagarme_id TEXT,
  customer_id UUID REFERENCES petloo_customers(id) ON DELETE SET NULL,
  plan_pagarme_id TEXT,
  plan_id UUID REFERENCES petloo_plans(id) ON DELETE SET NULL,
  code TEXT,
  status TEXT,
  payment_method TEXT,
  currency TEXT,
  interval TEXT,
  interval_count INTEGER,
  billing_type TEXT,
  installments INTEGER,
  start_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  current_cycle JSONB,
  card JSONB,
  items JSONB,
  metadata JSONB,
  pagarme_created_at TIMESTAMPTZ,
  pagarme_updated_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_petloo_subscriptions_customer_id ON petloo_subscriptions(customer_id);
CREATE INDEX idx_petloo_subscriptions_status ON petloo_subscriptions(status);
CREATE INDEX idx_petloo_subscriptions_next_billing_at ON petloo_subscriptions(next_billing_at);

-- ============================================================================
-- TABELA: petloo_invoices
-- ============================================================================
CREATE TABLE petloo_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_id TEXT NOT NULL UNIQUE,
  subscription_pagarme_id TEXT,
  subscription_id UUID REFERENCES petloo_subscriptions(id) ON DELETE SET NULL,
  customer_pagarme_id TEXT,
  customer_id UUID REFERENCES petloo_customers(id) ON DELETE SET NULL,
  charge_pagarme_id TEXT,
  cycle JSONB,
  code TEXT,
  amount INTEGER,
  installments INTEGER,
  status TEXT,
  payment_method TEXT,
  billing_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  total_discount INTEGER,
  total_increment INTEGER,
  subtotal INTEGER,
  metadata JSONB,
  pagarme_created_at TIMESTAMPTZ,
  pagarme_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_petloo_invoices_customer_id ON petloo_invoices(customer_id);
CREATE INDEX idx_petloo_invoices_subscription_id ON petloo_invoices(subscription_id);
CREATE INDEX idx_petloo_invoices_status ON petloo_invoices(status);
CREATE INDEX idx_petloo_invoices_billing_at ON petloo_invoices(billing_at);

-- ============================================================================
-- TABELA: petloo_charges
-- ============================================================================
CREATE TABLE petloo_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_id TEXT NOT NULL UNIQUE,
  customer_pagarme_id TEXT,
  customer_id UUID REFERENCES petloo_customers(id) ON DELETE SET NULL,
  invoice_pagarme_id TEXT,
  invoice_id UUID REFERENCES petloo_invoices(id) ON DELETE SET NULL,
  subscription_pagarme_id TEXT,
  subscription_id UUID REFERENCES petloo_subscriptions(id) ON DELETE SET NULL,
  code TEXT,
  amount INTEGER,
  paid_amount INTEGER,
  status TEXT,
  currency TEXT,
  payment_method TEXT,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  last_transaction JSONB,
  metadata JSONB,
  pagarme_created_at TIMESTAMPTZ,
  pagarme_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_petloo_charges_customer_id ON petloo_charges(customer_id);
CREATE INDEX idx_petloo_charges_invoice_id ON petloo_charges(invoice_id);
CREATE INDEX idx_petloo_charges_subscription_id ON petloo_charges(subscription_id);
CREATE INDEX idx_petloo_charges_status ON petloo_charges(status);
CREATE INDEX idx_petloo_charges_paid_at ON petloo_charges(paid_at);
CREATE INDEX idx_petloo_charges_due_at ON petloo_charges(due_at);

-- ============================================================================
-- TABELA: petloo_sync_logs
-- ============================================================================
CREATE TABLE petloo_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  total_records INTEGER,
  inserted_count INTEGER,
  updated_count INTEGER,
  error_message TEXT,
  details JSONB
);
CREATE INDEX idx_petloo_sync_logs_resource ON petloo_sync_logs(resource);
CREATE INDEX idx_petloo_sync_logs_started_at ON petloo_sync_logs(started_at DESC);

-- ============================================================================
-- TABELA: petloo_webhook_events
-- ============================================================================
CREATE TABLE petloo_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_petloo_webhook_events_event_type ON petloo_webhook_events(event_type);
CREATE INDEX idx_petloo_webhook_events_processed ON petloo_webhook_events(processed);
CREATE INDEX idx_petloo_webhook_events_received_at ON petloo_webhook_events(received_at DESC);

-- ============================================================================
-- TRIGGER: updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION petloo_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_petloo_customers_updated_at BEFORE UPDATE ON petloo_customers
  FOR EACH ROW EXECUTE FUNCTION petloo_update_updated_at();
CREATE TRIGGER trg_petloo_plans_updated_at BEFORE UPDATE ON petloo_plans
  FOR EACH ROW EXECUTE FUNCTION petloo_update_updated_at();
CREATE TRIGGER trg_petloo_subscriptions_updated_at BEFORE UPDATE ON petloo_subscriptions
  FOR EACH ROW EXECUTE FUNCTION petloo_update_updated_at();
CREATE TRIGGER trg_petloo_invoices_updated_at BEFORE UPDATE ON petloo_invoices
  FOR EACH ROW EXECUTE FUNCTION petloo_update_updated_at();
CREATE TRIGGER trg_petloo_charges_updated_at BEFORE UPDATE ON petloo_charges
  FOR EACH ROW EXECUTE FUNCTION petloo_update_updated_at();

-- ============================================================================
-- VIEW: petloo_customer_health
-- ============================================================================
CREATE OR REPLACE VIEW petloo_customer_health AS
SELECT
  c.id,
  c.pagarme_id,
  c.name,
  c.email,
  c.document,
  c.pagarme_created_at AS customer_since,
  COUNT(DISTINCT s.id) AS total_subscriptions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'canceled') AS canceled_subscriptions,
  COALESCE(SUM(ch.paid_amount) FILTER (WHERE ch.status = 'paid'), 0) AS lifetime_value,
  COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'paid') AS paid_charges_count,
  COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'failed') AS failed_charges_count,
  MAX(ch.paid_at) AS last_payment_at,
  MIN(s.next_billing_at) FILTER (WHERE s.status = 'active') AS next_billing_at
FROM petloo_customers c
LEFT JOIN petloo_subscriptions s ON s.customer_id = c.id
LEFT JOIN petloo_charges ch ON ch.customer_id = c.id
GROUP BY c.id;
