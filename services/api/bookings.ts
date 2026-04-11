import { apiRequest } from '@/services/api/http';
import type { BookingMasterRes, FlightBookingReq } from '@/types/api';

export function createFlightBooking(tripId: number, payload: FlightBookingReq) {
  return apiRequest<BookingMasterRes>(`/trips/${tripId}/bookings/flights`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getTripBookings(tripId: number) {
  return apiRequest<BookingMasterRes[]>(`/trips/${tripId}/bookings`, {
    method: 'GET',
  });
}
