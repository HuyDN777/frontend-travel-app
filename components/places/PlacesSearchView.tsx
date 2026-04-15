import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildGoogleMapsSearchUrl, formatDistanceMeters, haversineMeters } from '@/utils/geo';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchPlacesNearby } from '@/services/api/places';
import type { PlaceNearRes } from '@/types/api';
import { placeDetailQueryParams } from '@/utils/placeDetailParams';
import { resolvePlaceThumbUri } from '@/utils/placeStockPhotos';

function friendlyPlacesError(raw: string) {
  if (/ConnectException|ECONNREFUSED|Network request failed|Failed to fetch|socket/i.test(raw)) {
    return 'Không kết nối được backend hoặc máy chạy Spring không ra internet (firewall/VPN/tắt Wi‑Fi). Hãy bật backend và thử lại.';
  }
  return raw;
}

type Props = {
  kind: 'hotel' | 'restaurant';
  /** Ảnh hero (Unsplash / CDN) */
  heroUri: string;
  defaultLocation: string;
  searchButtonLabel: string;
  /** Bán kính khi tìm theo tên địa điểm */
  textSearchRadiusM?: number;
  /** Bán kính khi tìm theo GPS */
  gpsRadiusM?: number;
};

export function PlacesSearchView({
  kind,
  heroUri,
  defaultLocation,
  searchButtonLabel,
  textSearchRadiusM = 5000,
  gpsRadiusM = 2500,
}: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(defaultLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [places, setPlaces] = useState<PlaceNearRes[]>([]);
  const [modeLabel, setModeLabel] = useState('');
  /** Tâm GPS lần tìm gần đây — để hiển thị khoảng cách */
  const [gpsCenter, setGpsCenter] = useState<{ lat: number; lon: number } | null>(null);

  const handleTextSearch = async () => {
    if (!location.trim()) {
      setError('Nhập thành phố / khu vực.');
      return;
    }
    setLoading(true);
    setError('');
    setModeLabel('');
    setGpsCenter(null);
    try {
      const list = await searchPlacesNearby({
        location: location.trim(),
        kind,
        limit: 30,
        radiusMeters: textSearchRadiusM,
      });
      setPlaces(list);
      if (list.length === 0) {
        setError('Không có địa điểm trong bán kính. Thử đổi khu vực hoặc dùng “Quanh đây”.');
      }
    } catch (e) {
      setPlaces([]);
      setError(friendlyPlacesError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'));
    } finally {
      setLoading(false);
    }
  };

  const handleNearbyGps = async () => {
    setLoading(true);
    setError('');
    setModeLabel('');
    setGpsCenter(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Cần quyền vị trí để tìm quanh bạn. Bật trong Cài đặt > Ứng dụng.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const { latitude, longitude } = pos.coords;
      setGpsCenter({ lat: latitude, lon: longitude });

      const baseHint = kind === 'hotel' ? 'Khách sạn gần chỗ bạn nhất' : 'Nhà hàng gần chỗ bạn nhất';
      let where = '';
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        const r = rev[0];
        if (r) {
          const parts = [r.name, r.street, r.district, r.subregion, r.city, r.region].filter(
            (x): x is string => Boolean(x && String(x).trim())
          );
          if (parts.length) {
            where = ` · ${parts.slice(0, 2).join(', ')}`;
          }
        }
      } catch {
        /* giữ mặc định */
      }
      setModeLabel(`${baseHint}${where} · trong ~${Math.round(gpsRadiusM)} m`);

      const list = await searchPlacesNearby({
        kind,
        lat: latitude,
        lon: longitude,
        limit: 35,
        radiusMeters: gpsRadiusM,
      });
      setPlaces(list);
      if (list.length === 0) {
        setError('Không có địa điểm trong bán kính quanh bạn. Thử tăng bán kính hoặc tìm theo tên khu vực.');
      }
    } catch (e) {
      setPlaces([]);
      setError(
        friendlyPlacesError(e instanceof Error ? e.message : 'Không lấy được vị trí hoặc danh sách địa điểm.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroUri }} style={styles.heroImg} contentFit="cover" />
          <View style={[styles.heroTint, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          <View style={styles.heroTextBlock}>
            <Text style={[Typography.titleLG, styles.heroTitle]}>
              {kind === 'hotel' ? 'Khách sạn' : 'Nhà hàng'}
            </Text>
            <Text style={[Typography.caption, styles.heroSub]}>Tìm theo địa danh hoặc vị trí của bạn</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={styles.techRow}>
            <Ionicons name="search-outline" size={18} color={palette.primary} />
            <Text style={[Typography.caption, { color: palette.textMuted, flex: 1 }]}>
              Nhập khu vực hoặc bấm quanh đây để xem địa điểm gần bạn.
            </Text>
          </View>
          <Input value={location} onChangeText={setLocation} placeholder="Thành phố, quận, địa danh…" />
          <Button title={loading ? 'Đang tìm…' : searchButtonLabel} onPress={handleTextSearch} disabled={loading} />
          <Button
            title={loading ? 'Đang lấy vị trí…' : '📍 Quanh đây (GPS)'}
            variant="secondary"
            onPress={handleNearbyGps}
            disabled={loading}
          />
          {modeLabel ? (
            <Text style={[Typography.caption, { color: palette.success }]}>{modeLabel}</Text>
          ) : null}
          {loading ? <ActivityIndicator color={palette.primary} /> : null}
          {error ? <Text style={[Typography.caption, { color: palette.danger }]}>{error}</Text> : null}
        </Card>

        {places.map((p, index) => (
          <Card key={`${p.osmType}-${p.osmId}`} style={styles.row} padded={false}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/place-detail',
                  params: placeDetailQueryParams(kind, p),
                })
              }>
              <Image
                source={{ uri: resolvePlaceThumbUri(kind, p, index) }}
                style={[styles.mapThumb, { backgroundColor: palette.surfaceMuted }]}
                contentFit="cover"
                transition={200}
                recyclingKey={`${p.osmId}-${index}`}
              />
              <View style={styles.rowBody}>
                <Text style={[Typography.bodySemi, { color: palette.text }]}>{p.name}</Text>
                {p.addressLine ? (
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>{p.addressLine}</Text>
                ) : null}
                {gpsCenter ? (
                  <Text style={[Typography.caption, { color: palette.textMuted, marginTop: 2 }]}>
                    Cách bạn khoảng{' '}
                    {formatDistanceMeters(
                      haversineMeters(gpsCenter.lat, gpsCenter.lon, p.lat, p.lon)
                    )}
                  </Text>
                ) : null}
                <Text style={[Typography.caption, { color: palette.primary, marginTop: 2 }]}>
                  Chạm để xem chi tiết · chỉ đường · liên hệ (nếu có)
                </Text>
              </View>
            </Pressable>
            <View style={styles.actionBar}>
              <Pressable
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    buildGoogleMapsSearchUrl({
                      placeName: p.name,
                      address: p.addressLine,
                      lat: p.lat,
                      lon: p.lon,
                    })
                  )
                }
                style={[styles.chip, { backgroundColor: palette.surfaceMuted, flex: 1, justifyContent: 'center' }]}>
                <Ionicons name="map-outline" size={16} color={palette.text} />
                <Text style={[Typography.caption, { color: palette.text }]}>Chỉ đường</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: Spacing['2xl'] },
  heroWrap: {
    height: 200,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroTint: { ...StyleSheet.absoluteFillObject },
  heroTextBlock: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  heroTitle: { color: '#fff' },
  heroSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  card: {
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  techRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  row: {
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    padding: 0,
  },
  mapThumb: {
    width: '100%',
    height: 140,
  },
  rowBody: { padding: Spacing.md, gap: Spacing.xs },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
});
