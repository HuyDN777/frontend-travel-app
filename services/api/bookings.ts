import { apiRequest } from '@/services/api/http';
import type { BookingMasterRes, CoachBookingReq, FlightBookingReq } from '@/types/api';

export function createFlightBooking(tripId: number, payload: FlightBookingReq) {
  return apiRequest<BookingMasterRes>(`/trips/${tripId}/bookings/flights`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createFlightBookingWithoutTrip(payload: FlightBookingReq) {
  return apiRequest<BookingMasterRes>('/bookings/flights', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createCoachBooking(tripId: number, payload: CoachBookingReq) {
  return apiRequest<BookingMasterRes>(`/trips/${tripId}/bookings/coaches`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getTripBookings(tripId: number) {
  return apiRequest<BookingMasterRes[]>(`/trips/${tripId}/bookings`, {
    method: 'GET',
  });
}

export function getUserBookings(userId: number) {
  return apiRequest<BookingMasterRes[]>(`/users/${userId}/bookings`, {
    method: 'GET',
  });
}
