/** Khoảng cách trên mặt đất (mét), WGS84 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return r * c;
}

export function formatDistanceMeters(m: number): string {
  if (!Number.isFinite(m) || m < 0) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/**
 * Mở Google Maps theo **tên + địa chỉ** trước để dễ khớp đúng điểm (ảnh, đánh giá).
 * Chỉ dùng tọa độ khi không có chuỗi tìm kiếm đủ ý nghĩa.
 */
export function buildGoogleMapsSearchUrl(opts: {
  placeName?: string | null;
  address?: string | null;
  lat?: number;
  lon?: number;
}): string {
  const name = (opts.placeName ?? '').trim();
  const addr = (opts.address ?? '').trim();
  const text = [name, addr].filter(Boolean).join(' ').trim();
  if (text.length >= 2) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  }
  const { lat, lon } = opts;
  if (lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }
  return '';
}
