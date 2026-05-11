import { pagarmeRequest, paginate } from './client';
import type { PagarmeInvoice } from './types';

export function getInvoice(id: string) {
  return pagarmeRequest<PagarmeInvoice>('GET', `/invoices/${id}`);
}

export function listInvoices(query?: {
  created_since?: string;
  created_until?: string;
  customer_id?: string;
  subscription_id?: string;
  status?: string;
}) {
  return paginate<PagarmeInvoice>('/invoices', query);
}
