import type { PlaceNearRes } from '@/types/api';

/** Tham số cho màn `place-detail` (giữ gọn để tránh URL quá dài). */
export function placeDetailQueryParams(kind: 'hotel' | 'restaurant', p: PlaceNearRes) {
  return {
    kind,
    osmId: encodeURIComponent(p.osmId),
    placeName: encodeURIComponent(p.name),
    placeAddress: encodeURIComponent(p.addressLine || ''),
    lat: String(p.lat),
    lon: String(p.lon),
    previewImageUrl: p.previewImageUrl ? encodeURIComponent(p.previewImageUrl) : '',
    phone: encodeURIComponent(p.phone ?? ''),
    website: encodeURIComponent(p.website ?? ''),
    openingHours: encodeURIComponent(p.openingHours ?? ''),
    cuisine: encodeURIComponent(p.cuisine ?? ''),
    description: encodeURIComponent(p.description ?? ''),
    osmType: encodeURIComponent(p.osmType ?? ''),
    rating: p.rating != null && Number.isFinite(p.rating) ? String(p.rating) : '',
  };
}
