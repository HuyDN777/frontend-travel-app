import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { API_BASE_URL } from '@/services/api/http';
import type { PlaceNearRes, PlacesNearbyLocalResult } from '@/types/api';

export type NormalizedRestaurantRow = {
  id: string;
  title: string;
  thumbnail?: string;
  rating?: number;
};

function pickThumbnail(item: PlacesNearbyLocalResult | Record<string, unknown>): string | undefined {
  const raw =
    (item as PlacesNearbyLocalResult).thumbnail ??
    (item as PlacesNearbyLocalResult).serpapi_thumbnail ??
    (item as PlaceNearRes).previewImageUrl;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return undefined;
}

function parseRating(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Chấp nhận:
 * - `{ local_results: [...] }` (SerpAPI / proxy)
 * - Mảng `PlaceNearRes[]` (OSM backend hiện tại)
 */
export function normalizeNearbyPlacesPayload(data: unknown): NormalizedRestaurantRow[] {
  if (data == null) return [];

  if (Array.isArray(data)) {
    return data.map((item, index) => {
      const o = item as PlaceNearRes & PlacesNearbyLocalResult;
      const title = String(o.title ?? o.name ?? 'Không tên').trim() || 'Không tên';
      return {
        id: `arr-${index}-${o.osmId ?? title}`,
        title,
        thumbnail: pickThumbnail(o as Record<string, unknown>),
        rating: parseRating(o.rating),
      };
    });
  }

  if (typeof data === 'object' && data !== null && 'local_results' in data) {
    const list = (data as { local_results?: unknown }).local_results;
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => {
      const o = item as PlacesNearbyLocalResult & Record<string, unknown>;
      const title = String(o.title ?? o.name ?? 'Không tên').trim() || 'Không tên';
      return {
        id: `lr-${index}-${title}`,
        title,
        thumbnail: pickThumbnail(o),
        rating: parseRating(o.rating),
      };
    });
  }

  return [];
}

function buildNearbyUrl(apiBaseUrl: string, lat: number, lng: number, type: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  const path = '/places/nearby';
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('type', type);
  return url.toString();
}

function StarRating({ rating, color, emptyColor }: { rating: number; color: string; emptyColor: string }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const stars: ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Ionicons key={i} name="star" size={14} color={color} />);
    } else if (i === full && half) {
      stars.push(<Ionicons key={i} name="star-half" size={14} color={color} />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={14} color={emptyColor} />);
    }
  }
  return <View style={styles.starsRow}>{stars}</View>;
}

export type NearbyRestaurantsListProps = {
  lat: number;
  lng: number;
  /** Ví dụ `http://192.168.1.10:8080/api/v1` — mặc định dùng `API_BASE_URL` (env / Expo). */
  apiBaseUrl?: string;
  /** Mặc định `restaurant` — backend map sang `kind`. */
  type?: string;
  onItemPress?: (item: NormalizedRestaurantRow) => void;
  listEmptyText?: string;
};

/**
 * Gọi `GET .../places/nearby?lat=&lng=&type=restaurant`, parse `local_results` hoặc mảng OSM.
 */
export function NearbyRestaurantsList({
  lat,
  lng,
  apiBaseUrl = API_BASE_URL,
  type = 'restaurant',
  onItemPress,
  listEmptyText = 'Không có nhà hàng trong phạm vi tìm kiếm.',
}: NearbyRestaurantsListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<NormalizedRestaurantRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = buildNearbyUrl(apiBaseUrl, lat, lng, type);
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
      }
      let data: unknown;
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        throw new Error('Phản hồi không phải JSON.');
      }
      setRows(normalizeNearbyPlacesPayload(data));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, lat, lng, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const renderItem = ({ item }: { item: NormalizedRestaurantRow }) => {
    const content = (
      <View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} contentFit="cover" transition={120} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: palette.surfaceMuted }]}>
            <Ionicons name="restaurant-outline" size={28} color={palette.textMuted} />
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={[Typography.bodySemi, { color: palette.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.rating != null && item.rating > 0 ? (
            <View style={styles.ratingBlock}>
              <StarRating rating={Math.min(5, Math.max(0, item.rating))} color="#FBBF24" emptyColor={palette.border} />
              <Text style={[styles.ratingText, { color: palette.textMuted }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noRating, { color: palette.textMuted }]}>Chưa có đánh giá</Text>
          )}
        </View>
        {onItemPress ? (
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        ) : null}
      </View>
    );

    if (onItemPress) {
      return <Pressable onPress={() => onItemPress(item)}>{content}</Pressable>;
    }
    return content;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[Typography.body, { color: palette.danger, textAlign: 'center' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.listContent}
      ListEmptyComponent={
        <Text style={[Typography.body, { color: palette.textMuted, textAlign: 'center' }]}>{listEmptyText}</Text>
      }
    />
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  centered: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    backgroundColor: '#E5E7EB',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noRating: {
    fontSize: 13,
  },
});
