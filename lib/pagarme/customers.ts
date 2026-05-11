import { pagarmeRequest, paginate } from './client';
import type { PagarmeCustomer } from './types';

export function getCustomer(id: string) {
  return pagarmeRequest<PagarmeCustomer>('GET', `/customers/${id}`);
}

export function listCustomers(query?: { created_since?: string; created_until?: string }) {
  return paginate<PagarmeCustomer>('/customers', query);
}
