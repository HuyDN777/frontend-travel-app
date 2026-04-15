import { apiRequest } from '@/services/api/http';
import type { PlaceMapsEnrichRes, PlaceNearRes } from '@/types/api';

export function searchPlacesNearby(params: {
  /** Tìm theo tên địa điểm (geocode trên server) */
  location?: string;
  /** Hoặc tìm quanh tọa độ GPS (bỏ qua geocode) */
  lat?: number;
  lon?: number;
  kind: 'hotel' | 'restaurant';
  radiusMeters?: number;
  limit?: number;
}) {
  return apiRequest<PlaceNearRes[]>('/places/nearby', {
    method: 'GET',
    query: {
      location: params.location,
      lat: params.lat,
      lon: params.lon,
      kind: params.kind,
      radiusMeters: params.radiusMeters,
      limit: params.limit,
    },
  });
}

export function fetchMapsEnrich(params: {
  placeName: string;
  address?: string;
  lat: number;
  lon: number;
  placeId?: string;
}) {
  return apiRequest<PlaceMapsEnrichRes>('/places/maps-enrich', {
    method: 'GET',
    query: {
      placeName: params.placeName,
      address: params.address,
      lat: params.lat,
      lon: params.lon,
      placeId: params.placeId,
    },
  });
}
