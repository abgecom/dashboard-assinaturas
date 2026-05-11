import { pagarmeRequest, paginate } from './client';
import type { PagarmeCharge } from './types';

export function getCharge(id: string) {
  return pagarmeRequest<PagarmeCharge>('GET', `/charges/${id}`);
}

export function listCharges(query?: {
  created_since?: string;
  created_until?: string;
  customer_id?: string;
  subscription_id?: string;
  invoice_id?: string;
  status?: string;
}) {
  return paginate<PagarmeCharge>('/charges', query);
}
