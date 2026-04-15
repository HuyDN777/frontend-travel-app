import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchMapsEnrich } from '@/services/api/places';
import { createItineraryItem, getMyTrips, type TripItem } from '@/utils/api';
import { buildGoogleMapsSearchUrl } from '@/utils/geo';
import { resolvePlaceThumbUri } from '@/utils/placeStockPhotos';
import { moderateScale } from '@/utils/responsive';

function dec(s: string | undefined) {
  if (!s) return '';
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeWebsite(url: string) {
  const t = url.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export default function PlaceDetailScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const q = useLocalSearchParams<{
    kind?: string;
    osmId?: string;
    placeName?: string;
    placeAddress?: string;
    lat?: string;
    lon?: string;
    previewImageUrl?: string;
    phone?: string;
    website?: string;
    openingHours?: string;
    cuisine?: string;
    description?: string;
    osmType?: string;
    rating?: string;
  }>();

  const kind = q.kind === 'hotel' ? 'hotel' : 'restaurant';
  const osmId = dec(q.osmId) || '0';
  const osmType = dec(q.osmType) || '';
  const name = dec(q.placeName);
  const address = dec(q.placeAddress);
  const lat = Number(q.lat);
  const lon = Number(q.lon);
  const previewImageUrl = dec(q.previewImageUrl) || undefined;
  const phone = dec(q.phone);
  const website = dec(q.website);
  const openingHours = dec(q.openingHours);
  const cuisine = dec(q.cuisine);
  const description = dec(q.description);
  const ratingParam = q.rating != null && q.rating !== '' ? Number(q.rating) : NaN;
  const ratingFromNav = Number.isFinite(ratingParam) ? ratingParam : undefined;

  const [mapsExtra, setMapsExtra] = useState<{
    phone?: string | null;
    website?: string | null;
    openingHours?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
    typeLabel?: string | null;
    snippet?: string | null;
    description?: string | null;
    price?: string | null;
  } | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [addingTripId, setAddingTripId] = useState<number | null>(null);

  const needsBackendEnrich = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if (!(name || address)) return false;
    const isOsm =
      !osmType || osmType === 'node' || osmType === 'way' || osmType === 'relation';
    const serpSparse = osmType === 'serpapi' && (!openingHours || !phone);
    return isOsm || serpSparse;
  }, [lat, lon, name, address, osmType, openingHours, phone]);

  useEffect(() => {
    if (!needsBackendEnrich) return;
    let cancelled = false;
    setEnrichLoading(true);
    void (async () => {
      try {
        const data = await fetchMapsEnrich({
          placeName: name || address || 'Địa điểm',
          address: address || undefined,
          lat,
          lon,
          placeId: osmId.startsWith('p_') ? undefined : osmId,
        });
        if (!cancelled && data) setMapsExtra(data);
      } catch {
        /* Serp tắt hoặc mạng lỗi — giữ màn hình hiện tại */
      } finally {
        if (!cancelled) setEnrichLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsBackendEnrich, name, address, lat, lon, osmId]);

  const mergedPhone = phone || mapsExtra?.phone || '';
  const mergedWebsite = website || mapsExtra?.website || mapsExtra?.bookingLink || '';
  const mergedBookingLink = mapsExtra?.bookingLink || '';
  const mergedOpeningHours = openingHours || mapsExtra?.openingHours || '';
  const mergedOpenNow = mapsExtra?.openNow;
  const mergedOpenState = mapsExtra?.openState || '';
  const mergedRating =
    ratingFromNav ??
    (mapsExtra?.rating != null && Number.isFinite(mapsExtra.rating) ? mapsExtra.rating : undefined);
  const mergedDescription = description || mapsExtra?.description || mapsExtra?.snippet || '';
  const mergedPrice = mapsExtra?.price?.trim() || '';
  const mergedReviewsCount =
    mapsExtra?.reviewsCount != null && mapsExtra.reviewsCount > 0 ? mapsExtra.reviewsCount : undefined;
  const mergedAmenities = mapsExtra?.amenities?.filter(Boolean) ?? [];
  const highlightedReviews = mapsExtra?.reviews?.filter((r) => !!r?.summary) ?? [];

  const heroUri = useMemo(
    () =>
      resolvePlaceThumbUri(
        kind,
        {
          previewImageUrl,
          osmId,
          name,
          addressLine: address,
        },
        0
      ),
    [kind, previewImageUrl, osmId, name, address]
  );

  const googleMapsUrl = useMemo(
    () => buildGoogleMapsSearchUrl({ placeName: name, address, lat, lon }),
    [lat, lon, name, address]
  );

  const isRealPhoto = !!(previewImageUrl && /^https?:\/\//i.test(previewImageUrl));

  const hasDetailBlock = !!(
    cuisine ||
    mergedOpeningHours ||
    mergedPhone ||
    mergedWebsite ||
    mergedDescription ||
    mergedRating != null ||
    mergedReviewsCount != null ||
    mapsExtra?.typeLabel ||
    mergedPrice
  );

  const canCall = !!mergedPhone;
  const canOpenWebsite = !!(mergedWebsite || mergedBookingLink);
  const websiteTarget = normalizeWebsite(mergedWebsite || mergedBookingLink);

  async function openDirection() {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      if (!googleMapsUrl) return;
      await WebBrowser.openBrowserAsync(googleMapsUrl);
      return;
    }
    const appleUrl = `http://maps.apple.com/?ll=${lat},${lon}&q=${encodeURIComponent(name || address || 'Địa điểm')}`;
    const googleNativeUrl = `comgooglemaps://?q=${lat},${lon}`;
    if (Platform.OS === 'ios') {
      const canOpenGoogle = await Linking.canOpenURL(googleNativeUrl);
      await Linking.openURL(canOpenGoogle ? googleNativeUrl : appleUrl);
      return;
    }
    if (googleMapsUrl) {
      await Linking.openURL(googleMapsUrl);
    }
  }

  async function openCall() {
    if (!canCall) return;
    const tel = `tel:${mergedPhone.replace(/\s/g, '')}`;
    const supported = await Linking.canOpenURL(tel);
    if (!supported) return;
    await Linking.openURL(tel);
  }

  async function openWebsite() {
    if (!canOpenWebsite) return;
    await WebBrowser.openBrowserAsync(websiteTarget);
  }

  async function openAddToTripModal() {
    try {
      setTripsLoading(true);
      const list = await getMyTrips();
      setTrips(list);
      setTripModalVisible(true);
    } catch {
      setTrips([]);
      setTripModalVisible(true);
    } finally {
      setTripsLoading(false);
    }
  }

  async function addToTrip(tripId: number) {
    try {
      setAddingTripId(tripId);
      await createItineraryItem({
        tripId,
        kind,
        placeName: name || 'Địa điểm',
        address: address || undefined,
        lat: Number.isFinite(lat) ? lat : undefined,
        lon: Number.isFinite(lon) ? lon : undefined,
        phone: mergedPhone || undefined,
        website: mergedWebsite || undefined,
        bookingLink: mergedBookingLink || undefined,
        rating: mergedRating,
        openNow: mergedOpenNow ?? undefined,
        amenities: mergedAmenities,
        reviews: highlightedReviews.map((r) => (r.summary || '').trim()).filter(Boolean),
      });
      setTripModalVisible(false);
    } catch {
      // keep modal open so user can retry
    } finally {
      setAddingTripId(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + Spacing.sm,
            borderBottomColor: palette.border,
            backgroundColor: palette.background,
          },
        ]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}
          accessibilityLabel="Quay lại">
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <Text style={[Typography.bodySemi, { color: palette.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {kind === 'hotel' ? 'Chi tiết khách sạn' : 'Chi tiết nhà hàng'}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroUri }} style={styles.hero} contentFit="cover" transition={200} />
        </View>
        {!isRealPhoto ? (
          <Text style={[Typography.caption, styles.disclaimer, { color: palette.textMuted }]}>
            Ảnh minh họa — nên xem thực tế hoặc trên bản đồ trước khi tới.
          </Text>
        ) : null}

        <View style={styles.pad}>
          <Text style={[Typography.titleLG, { color: palette.text }]}>{name || 'Địa điểm'}</Text>
          {address ? (
            <Text style={[Typography.body, { color: palette.textMuted, marginTop: Spacing.xs, lineHeight: 22 }]}>
              {address}
            </Text>
          ) : null}

          {mergedOpenNow != null ? (
            <View style={[styles.openBadge, mergedOpenNow ? styles.openBadgeOpen : styles.openBadgeClosed]}>
              <Ionicons name={mergedOpenNow ? 'checkmark-circle' : 'close-circle'} size={16} color="#0B1B18" />
              <Text style={styles.openBadgeText}>
                {mergedOpenNow ? 'Đang mở cửa' : 'Hiện đang đóng cửa'}
                {mergedOpenState ? ` · ${mergedOpenState}` : ''}
              </Text>
            </View>
          ) : null}

          {enrichLoading ? (
            <View style={[styles.enrichRow, { paddingHorizontal: Spacing.lg }]}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={[Typography.caption, { color: palette.textMuted, marginLeft: Spacing.sm }]}>
                Đang tải thêm từ Google Maps…
              </Text>
            </View>
          ) : null}

          {hasDetailBlock ? (
            <Card style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Thông tin thêm</Text>

              {mapsExtra?.typeLabel ? (
                <View style={styles.row}>
                  <Ionicons name="pricetag-outline" size={18} color={palette.primary} />
                  <Text style={[Typography.body, { color: palette.text, flex: 1 }]}>{mapsExtra.typeLabel}</Text>
                </View>
              ) : null}

              {mergedPrice ? (
                <View style={styles.row}>
                  <Ionicons name="wallet-outline" size={18} color={palette.primary} />
                  <Text style={[Typography.body, { color: palette.text, flex: 1 }]}>Mức giá: {mergedPrice}</Text>
                </View>
              ) : null}

              {mergedRating != null ? (
                <View style={styles.row}>
                  <Ionicons name="star" size={18} color={palette.primary} />
                  <Text style={[Typography.body, { color: palette.text, flex: 1 }]}>
                    {mergedRating.toFixed(1)} / 5
                    {mergedReviewsCount != null ? ` · ${mergedReviewsCount} đánh giá` : ''}
                  </Text>
                </View>
              ) : null}

              {cuisine ? (
                <View style={styles.row}>
                  <Ionicons name="restaurant-outline" size={18} color={palette.primary} />
                  <Text style={[Typography.body, { color: palette.text, flex: 1 }]}>Ẩm thực: {cuisine}</Text>
                </View>
              ) : null}

              {mergedOpeningHours ? (
                <View style={styles.block}>
                  <View style={styles.row}>
                    <Ionicons name="time-outline" size={18} color={palette.primary} />
                    <Text style={[Typography.bodySemi, { color: palette.text }]}>Giờ mở cửa</Text>
                  </View>
                  <Text style={[Typography.caption, { color: palette.textMuted, marginTop: 4, lineHeight: 20 }]}>
                    {mergedOpeningHours}
                  </Text>
                </View>
              ) : null}

              {mergedPhone ? (
                <Pressable onPress={openCall} style={styles.row}>
                  <Ionicons name="call-outline" size={18} color={palette.primary} />
                  <Text style={[Typography.body, { color: palette.accent, flex: 1, textDecorationLine: 'underline' }]}>
                    {mergedPhone}
                  </Text>
                </Pressable>
              ) : null}

              {mergedWebsite ? (
                <Pressable onPress={openWebsite} style={styles.row}>
                  <Ionicons name="globe-outline" size={18} color={palette.primary} />
                  <Text style={[Typography.body, { color: palette.accent, flex: 1 }]} numberOfLines={2}>
                    Trang web
                  </Text>
                </Pressable>
              ) : null}

              {mergedDescription ? (
                <Text style={[Typography.caption, { color: palette.textMuted, marginTop: Spacing.sm, lineHeight: 20 }]}>
                  {mergedDescription}
                </Text>
              ) : null}
            </Card>
          ) : (
            <Text style={[Typography.caption, { color: palette.textMuted, lineHeight: 20 }]}>
              App chỉ đang có tên và địa chỉ cho điểm này; giờ mở cửa, số điện thoại hay mô tả chưa có trong dữ liệu
              nguồn. Bấm nút Chỉ đường (Google Maps) bên dưới để xem vị trí — trên Maps đôi khi có thêm ảnh hoặc bình
              luận để tham khảo, tùy địa điểm.
            </Text>
          )}

          {mergedAmenities.length > 0 ? (
            <Card style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Tiện nghi</Text>
              <View style={styles.chipsWrap}>
                {mergedAmenities.map((amenity, index) => (
                  <View key={`${amenity}-${index}`} style={[styles.chip, { borderColor: palette.border }]}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={palette.primary} />
                    <Text style={[Typography.caption, { color: palette.text }]}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {highlightedReviews.length > 0 ? (
            <Card style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Đánh giá nổi bật</Text>
              {highlightedReviews.slice(0, 3).map((review, index) => (
                <View key={`${review.summary}-${index}`} style={styles.reviewRow}>
                  <Text style={[Typography.bodySemi, { color: palette.text }]}>
                    {review.user || `Người dùng ${index + 1}`}
                    {review.rating != null ? ` · ${review.rating.toFixed(1)}★` : ''}
                  </Text>
                  <Text style={[Typography.caption, { color: palette.textMuted, lineHeight: 20 }]}>{review.summary}</Text>
                  {review.relativeDate ? (
                    <Text style={[Typography.caption, { color: palette.textMuted }]}>{review.relativeDate}</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          <View style={styles.actions}>
            <Button title="Chỉ đường" variant="primary" onPress={openDirection} disabled={!googleMapsUrl} />
            <Button title="Liên hệ" variant="secondary" onPress={openCall} disabled={!canCall} />
            <Button title="Xem website" variant="secondary" onPress={openWebsite} disabled={!canOpenWebsite} />
            <Button title="Thêm vào hành trình" variant="ghost" onPress={openAddToTripModal} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={tripModalVisible} transparent animationType="slide" onRequestClose={() => setTripModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.titleLG, { color: palette.text }]}>Chọn chuyến đi</Text>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>
              Chọn chuyến đi để thêm địa điểm này vào lịch trình.
            </Text>
            {tripsLoading ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : trips.length === 0 ? (
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Bạn chưa có chuyến đi nào để thêm.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {trips.map((trip) => (
                  <Pressable
                    key={trip.id}
                    onPress={() => addToTrip(trip.id)}
                    style={[styles.tripOption, { borderColor: palette.border }]}>
                    <Text style={[Typography.bodySemi, { color: palette.text }]}>{trip.tripName}</Text>
                    <Text style={[Typography.caption, { color: palette.textMuted }]}>{trip.destination}</Text>
                    {addingTripId === trip.id ? <ActivityIndicator size="small" color={palette.primary} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Button title="Đóng" variant="secondary" onPress={() => setTripModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: { width: moderateScale(40) },
  scroll: { paddingBottom: Spacing['2xl'] },
  heroWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Elevation.card,
  },
  hero: { width: '100%', height: 220 },
  disclaimer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  pad: { padding: Spacing.lg, gap: Spacing.md },
  enrichRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  section: { gap: Spacing.md, padding: Spacing.lg, borderWidth: 1, borderRadius: Radius.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  block: { marginTop: Spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  openBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
  },
  openBadgeOpen: { backgroundColor: '#B8EBD3' },
  openBadgeClosed: { backgroundColor: '#F8D7DA' },
  openBadgeText: { color: '#0B1B18', fontWeight: '700' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewRow: { gap: 4, marginTop: Spacing.sm, paddingBottom: Spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tripOption: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 4,
  },
});
