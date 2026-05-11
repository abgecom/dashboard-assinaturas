import { pagarmeRequest, paginate } from './client';
import type { PagarmePlan } from './types';

export function getPlan(id: string) {
  return pagarmeRequest<PagarmePlan>('GET', `/plans/${id}`);
}

export function listPlans() {
  return paginate<PagarmePlan>('/plans');
}
