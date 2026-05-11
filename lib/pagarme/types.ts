/**
 * Tipos da API Pagar.me v5. Não é exaustivo — só os campos que o dashboard usa.
 * Campos opcionais ficam `unknown | null` quando não modelados pra evitar acoplamento.
 */

export interface PagarmePaging {
  total: number;
  previous: string | null;
  next: string | null;
}

export interface PagarmeListResponse<T> {
  data: T[];
  paging: PagarmePaging;
}

export interface PagarmeAddress {
  line_1?: string | null;
  line_2?: string | null;
  zip_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  [k: string]: unknown;
}

export interface PagarmePhoneNumber {
  country_code?: string | null;
  area_code?: string | null;
  number?: string | null;
}

export interface PagarmePhones {
  home_phone?: PagarmePhoneNumber | null;
  mobile_phone?: PagarmePhoneNumber | null;
  [k: string]: unknown;
}

export interface PagarmeCustomer {
  id: string;
  name?: string | null;
  email?: string | null;
  document?: string | null;
  document_type?: string | null;
  type?: string | null;
  phones?: PagarmePhones | null;
  address?: PagarmeAddress | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PagarmePlan {
  id: string;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  interval?: string | null;
  interval_count?: number | null;
  billing_type?: string | null;
  payment_methods?: string[] | null;
  installments?: number[] | null;
  items?: unknown[] | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PagarmeSubscription {
  id: string;
  code?: string | null;
  status?: string | null;
  payment_method?: string | null;
  currency?: string | null;
  interval?: string | null;
  interval_count?: number | null;
  billing_type?: string | null;
  installments?: number | null;
  start_at?: string | null;
  next_billing_at?: string | null;
  current_cycle?: unknown | null;
  card?: unknown | null;
  items?: unknown[] | null;
  metadata?: Record<string, unknown> | null;
  customer?: { id: string } | null;
  plan?: { id: string } | null;
  created_at: string;
  updated_at: string;
  canceled_at?: string | null;
}

export interface PagarmeInvoice {
  id: string;
  code?: string | null;
  status?: string | null;
  payment_method?: string | null;
  amount?: number | null;
  installments?: number | null;
  billing_at?: string | null;
  seen_at?: string | null;
  total_discount?: number | null;
  total_increment?: number | null;
  subtotal?: number | null;
  cycle?: unknown | null;
  metadata?: Record<string, unknown> | null;
  subscription?: { id: string } | null;
  customer?: { id: string } | null;
  charge?: { id: string } | null;
  created_at: string;
  updated_at: string;
}

export interface PagarmeCharge {
  id: string;
  code?: string | null;
  status?: string | null;
  currency?: string | null;
  payment_method?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  due_at?: string | null;
  paid_at?: string | null;
  canceled_at?: string | null;
  last_transaction?: unknown | null;
  metadata?: Record<string, unknown> | null;
  customer?: { id: string } | null;
  invoice?: { id: string } | null;
  subscription?: { id: string } | null;
  created_at: string;
  updated_at: string;
}

export class PagarmeError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;
  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'PagarmeError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
