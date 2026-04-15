import { apiRequest } from '@/services/api/http';
import type {
  BudgetRow,
  BudgetUpsertReq,
  CategoryAnalyticsRes,
  ExpenseCreateReq,
  ExpenseRow,
  TripBalanceRes,
} from '@/types/api';

export function upsertTripBudget(tripId: number, body: BudgetUpsertReq) {
  return apiRequest<BudgetRow>(`/trips/${tripId}/budget`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function getTripBudgets(tripId: number) {
  return apiRequest<BudgetRow[]>(`/trips/${tripId}/budget`, { method: 'GET' });
}

export function createTripExpense(tripId: number, body: ExpenseCreateReq) {
  return apiRequest<ExpenseRow>(`/trips/${tripId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getTripExpenses(tripId: number) {
  return apiRequest<ExpenseRow[]>(`/trips/${tripId}/expenses`, { method: 'GET' });
}

export function getTripBalance(tripId: number) {
  return apiRequest<TripBalanceRes>(`/trips/${tripId}/finance/balance`, { method: 'GET' });
}

export function getExpenseCategoryAnalytics(tripId: number) {
  return apiRequest<CategoryAnalyticsRes[]>(`/trips/${tripId}/expenses/analytics`, {
    method: 'GET',
    query: { groupBy: 'category' },
  });
}
