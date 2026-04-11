import { apiRequest } from '@/services/api/http';
import type { FlightSearchParams } from '@/types/api';

export function searchFlights(params: FlightSearchParams) {
  return apiRequest<unknown>('/flights/search', {
    method: 'GET',
    query: params,
  });
}

export function bookFlight(bookingRequest: unknown) {
  return apiRequest<unknown>('/flights/book', {
    method: 'POST',
    body: JSON.stringify(bookingRequest),
  });
}
