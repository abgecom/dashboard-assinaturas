import { pagarmeRequest, paginate } from './client';
import type { PagarmeSubscription } from './types';

export function getSubscription(id: string) {
  return pagarmeRequest<PagarmeSubscription>('GET', `/subscriptions/${id}`);
}

export function listSubscriptions(query?: {
  created_since?: string;
  created_until?: string;
  customer_id?: string;
  status?: string;
}) {
  return paginate<PagarmeSubscription>('/subscriptions', query);
}
