import { apiRequest } from '@/services/api/http';
import type { PaymentInitiateReq, PaymentInitiateRes } from '@/types/api';

export function initiatePayment(tripId: number, bookingId: number, payload: PaymentInitiateReq) {
  return apiRequest<PaymentInitiateRes>(`/trips/${tripId}/bookings/${bookingId}/payments/initiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function initiatePaymentWithoutTrip(userId: number, bookingId: number, payload: PaymentInitiateReq) {
  return apiRequest<PaymentInitiateRes>(`/users/${userId}/bookings/${bookingId}/payments/initiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
