import { apiRequest } from '@/services/api/http';
import type {
  BudgetRow,
  BudgetUpsertReq,
  CategoryAnalyticsRes,
  ExpenseCreateReq,
  ExpenseUpdateReq,
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

export function getTripExpenses(tripId: number, filters?: { fromDate?: string; toDate?: string }) {
  return apiRequest<ExpenseRow[]>(`/trips/${tripId}/expenses`, {
    method: 'GET',
    query: {
      fromDate: filters?.fromDate,
      toDate: filters?.toDate,
    },
  });
}

export function updateTripExpense(tripId: number, expenseId: number, body: ExpenseUpdateReq) {
  return apiRequest<ExpenseRow>(`/trips/${tripId}/expenses/${expenseId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteTripExpense(tripId: number, expenseId: number) {
  return apiRequest<string>(`/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' });
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
