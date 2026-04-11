import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchFlights } from '@/services/api/flights';
import { API_BASE_URL } from '@/services/api/http';

type OfferViewModel = {
  id: string;
  totalAmount: string;
  currency: string;
  totalDuration: string;
  segmentsCount: number;
  airlineName: string;
  airlineLogo?: string;
  flightNumber: string;
  pnrCode?: string;
  fromCode: string;
  toCode: string;
  departAt: string;
  arriveAt: string;
  departIso: string;
  arriveIso: string;
};

type AirportOption = {
  label: string;
  city: string;
  code: string;
  aliases?: string[];
};

const AIRPORT_OPTIONS: AirportOption[] = [
  { label: 'TP.HCM (SGN)', city: 'TP.HCM', code: 'SGN', aliases: ['sai gon', 'ho chi minh'] },
  { label: 'Hà Nội (HAN)', city: 'Hà Nội', code: 'HAN' },
  { label: 'Đà Nẵng (DAD)', city: 'Đà Nẵng', code: 'DAD' },
  { label: 'Nha Trang (CXR)', city: 'Nha Trang', code: 'CXR', aliases: ['khanh hoa'] },
  { label: 'Phú Quốc (PQC)', city: 'Phú Quốc', code: 'PQC', aliases: ['kien giang'] },
  { label: 'Cần Thơ (VCA)', city: 'Cần Thơ', code: 'VCA', aliases: ['vinh long', 'hau giang', 'soc trang'] },
  { label: 'Cà Mau (CAH)', city: 'Cà Mau', code: 'CAH', aliases: ['bac lieu'] },
  { label: 'Rạch Giá - Kiên Giang (VKG)', city: 'Kiên Giang', code: 'VKG', aliases: ['rach gia'] },
  { label: 'Buôn Ma Thuột (BMV)', city: 'Đắk Lắk', code: 'BMV' },
  { label: 'Pleiku (PXU)', city: 'Gia Lai', code: 'PXU', aliases: ['kon tum'] },
  { label: 'Vinh (VII)', city: 'Nghệ An', code: 'VII', aliases: ['ha tinh'] },
  { label: 'Hải Phòng (HPH)', city: 'Hải Phòng', code: 'HPH', aliases: ['hai duong', 'quang ninh'] },
  { label: 'Thanh Hóa (THD)', city: 'Thanh Hóa', code: 'THD', aliases: ['ninh binh', 'nam dinh'] },
  { label: 'Huế (HUI)', city: 'Huế', code: 'HUI', aliases: ['thua thien hue'] },
  { label: 'Đồng Hới (VDH)', city: 'Quảng Bình', code: 'VDH' },
  { label: 'Chu Lai (VCL)', city: 'Quảng Nam', code: 'VCL' },
  { label: 'Quy Nhơn (UIH)', city: 'Bình Định', code: 'UIH' },
  { label: 'Tuy Hòa (TBB)', city: 'Phú Yên', code: 'TBB' },
  { label: 'Liên Khương - Đà Lạt (DLI)', city: 'Đà Lạt', code: 'DLI', aliases: ['lam dong'] },
  { label: 'Điện Biên (DIN)', city: 'Điện Biên', code: 'DIN', aliases: ['dien bien'] },
];

const LOCATION_ALIAS_TO_CODE: Record<string, string> = {
  'sa pa': 'HAN',
  sapa: 'HAN',
  'lao cai': 'HAN',
  'vinh long': 'VCA',
  'ben tre': 'VCA',
  'tien giang': 'VCA',
  'dong thap': 'VCA',
  'tra vinh': 'VCA',
  'an giang': 'VKG',
  'kien giang': 'VKG',
  'ca mau': 'CAH',
  'bac lieu': 'CAH',
  'soc trang': 'VCA',
  'kon tum': 'PXU',
  'dak nong': 'BMV',
  'dak lak': 'BMV',
  'quang tri': 'HUI',
  'quang nam': 'VCL',
  'quang ngai': 'DAD',
  'binh duong': 'SGN',
  'dong nai': 'SGN',
  'ba ria vung tau': 'SGN',
  'tay ninh': 'SGN',
  'long an': 'SGN',
  hanoi: 'HAN',
  'ho chi minh': 'SGN',
  'sai gon': 'SGN',
};

const USD_TO_VND_RATE = 26000;

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function formatIsoDuration(duration: string) {
  if (!duration) return 'Không rõ';
  const match = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/i.exec(duration);
  if (!match) return duration;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  if (!hours && !minutes) return duration;
  if (!hours) return `${minutes} phút`;
  if (!minutes) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function formatDateTime(dateTime: string) {
  if (!dateTime) return '--:--';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatMoneyVndFromAny(amountText: string, currency: string) {
  const amount = Number(amountText);
  if (!Number.isFinite(amount)) return `${amountText} ${currency}`;
  const vndAmount = currency.toUpperCase() === 'VND' ? amount : amount * USD_TO_VND_RATE;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(vndAmount);
}

function normalizeOffers(payload: unknown): OfferViewModel[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, any>;
  const dataNode = root.data as Record<string, any> | undefined;
  const rawOffers = (dataNode?.offers ?? root.offers) as unknown[];
  const included = Array.isArray(dataNode?.included) ? (dataNode.included as Array<Record<string, any>>) : [];
  const airlinesById = new Map(
    included
      .filter((item) => item?.type === 'airline' && item?.id)
      .map((item) => [item.id as string, item])
  );

  if (!Array.isArray(rawOffers)) return [];

  return rawOffers.slice(0, 8).map((offer, index) => {
    const item = offer as Record<string, any>;
    const slices = Array.isArray(item.slices) ? item.slices : [];
    const firstSlice = slices[0] ?? {};
    const firstSegment = Array.isArray(firstSlice?.segments) ? firstSlice.segments[0] : undefined;
    const owner = airlinesById.get(item.owner ?? item.owner_id);
    const marketingCarrier = firstSegment?.marketing_carrier;
    const operatingCarrier = firstSegment?.operating_carrier;
    const segmentsCount = slices.reduce((sum: number, s: any) => {
      const segments = Array.isArray(s?.segments) ? s.segments.length : 0;
      return sum + segments;
    }, 0);

    return {
      id: item.id ?? `offer-${index}`,
      totalAmount: item.total_amount ?? item.totalAmount ?? '0',
      currency: item.total_currency ?? item.currency ?? 'USD',
      totalDuration: formatIsoDuration(firstSlice?.duration ?? ''),
      segmentsCount,
      airlineName: marketingCarrier?.name ?? operatingCarrier?.name ?? owner?.name ?? 'Hãng bay',
      airlineLogo:
        marketingCarrier?.logo_symbol_url ??
        marketingCarrier?.logo_lockup_url ??
        operatingCarrier?.logo_symbol_url ??
        operatingCarrier?.logo_lockup_url ??
        owner?.logo_symbol_url ??
        owner?.logo_lockup_url ??
        undefined,
      flightNumber:
        firstSegment?.marketing_carrier_flight_number ??
        firstSegment?.operating_carrier_flight_number ??
        `${firstSegment?.marketing_carrier?.iata_code ?? 'FL'}-${index + 1}`,
      pnrCode: item.id ? String(item.id).slice(-6).toUpperCase() : undefined,
      fromCode: firstSegment?.origin?.iata_code ?? '---',
      toCode: firstSegment?.destination?.iata_code ?? '---',
      departAt: formatDateTime(firstSegment?.departing_at ?? ''),
      arriveAt: formatDateTime(firstSegment?.arriving_at ?? ''),
      departIso: firstSegment?.departing_at ?? '',
      arriveIso: firstSegment?.arriving_at ?? '',
    };
  });
}

function filterAirportOptions(keyword: string) {
  const q = normalizeText(keyword);
  if (!q) return AIRPORT_OPTIONS;
  return AIRPORT_OPTIONS.filter(
    (item) =>
      normalizeText(item.label).includes(q) ||
      normalizeText(item.city).includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.aliases ?? []).some((alias) => normalizeText(alias).includes(q))
  );
}

export default function FlightsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [originCode, setOriginCode] = useState('SGN');
  const [destinationCode, setDestinationCode] = useState('HAN');
  const [originQuery, setOriginQuery] = useState('TP.HCM');
  const [destinationQuery, setDestinationQuery] = useState('Hà Nội');
  const [departureDate, setDepartureDate] = useState('2026-05-20');
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<unknown>(null);
  const [error, setError] = useState('');
  const searchCacheRef = useRef<Record<string, unknown>>({});

  const offers = useMemo(() => normalizeOffers(raw), [raw]);
  const originOptions = useMemo(() => filterAirportOptions(originQuery), [originQuery]);
  const destinationOptions = useMemo(() => filterAirportOptions(destinationQuery), [destinationQuery]);

  const originLabel = AIRPORT_OPTIONS.find((item) => item.code === originCode)?.label ?? originCode;
  const destinationLabel = AIRPORT_OPTIONS.find((item) => item.code === destinationCode)?.label ?? destinationCode;
  const dateOptions = useMemo(() => {
    const options: Array<{ label: string; value: string }> = [];
    const today = new Date();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
      options.push({ label, value });
    }
    return options;
  }, []);

  const detectCodeFromQuery = (query: string): string | null => {
    const normalizedQuery = normalizeText(query);
    const mappedCode = LOCATION_ALIAS_TO_CODE[normalizedQuery];
    if (mappedCode) return mappedCode;
    const exact = AIRPORT_OPTIONS.find(
      (item) =>
        normalizeText(item.city) === normalizedQuery ||
        normalizeText(item.label) === normalizedQuery ||
        (item.aliases ?? []).some((alias) => normalizeText(alias) === normalizedQuery)
    );
    if (exact) return exact.code;
    const partial = AIRPORT_OPTIONS.find(
      (item) =>
        normalizeText(item.city).includes(normalizedQuery) ||
        normalizeText(item.label).includes(normalizedQuery) ||
        (item.aliases ?? []).some((alias) => normalizeText(alias).includes(normalizedQuery))
    );
    if (partial) return partial.code;
    const rawCode = query.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(rawCode)) return rawCode;
    return null;
  };

  const handleSearch = async () => {
    const effectiveOrigin = detectCodeFromQuery(originQuery);
    const effectiveDestination = detectCodeFromQuery(destinationQuery);
    if (!effectiveOrigin) {
      setError('Không nhận diện được điểm đi. Hãy chọn trong gợi ý hoặc nhập mã IATA.');
      return;
    }
    if (!effectiveDestination) {
      setError('Không nhận diện được điểm đến. Hãy chọn trong gợi ý hoặc nhập mã IATA.');
      return;
    }
    if (effectiveOrigin === effectiveDestination) {
      setError('Điểm đi và điểm đến không được trùng nhau. Vui lòng chọn lại hành trình.');
      return;
    }

    setOriginCode(effectiveOrigin);
    setDestinationCode(effectiveDestination);
    const cacheKey = `${effectiveOrigin}-${effectiveDestination}-${departureDate.trim()}`;

    try {
      setLoading(true);
      setError('');
      if (searchCacheRef.current[cacheKey]) {
        setRaw(searchCacheRef.current[cacheKey]);
        return;
      }
      const result = await searchFlights({
        originLocationCode: effectiveOrigin,
        destinationLocationCode: effectiveDestination,
        departureDate: departureDate.trim(),
        adults: 1,
        currencyCode: 'VND',
        max: 10,
      });
      searchCacheRef.current[cacheKey] = result;
      setRaw(result);
    } catch (e) {
      setRaw(null);
      if (e instanceof TypeError) {
        setError(`Không kết nối được máy chủ (${API_BASE_URL}).`);
      } else {
        setError(e instanceof Error ? e.message : 'Không thể tìm chuyến bay');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[Typography.titleLG, { color: palette.text }]}>Đặt chuyến bay</Text>

        <Card style={styles.formCard}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Điểm đi ({originLabel})</Text>
          <Input value={originQuery} onChangeText={setOriginQuery} placeholder="Tìm điểm đi: Hà Nội, TP.HCM..." />
          <View style={styles.optionsGrid}>
            {originOptions.slice(0, 6).map((item, idx) => (
              <Pressable
                key={`origin-${item.code}-${idx}`}
                onPress={() => {
                  setOriginCode(item.code);
                  setOriginQuery(item.city);
                }}
                style={[styles.optionChip, { backgroundColor: originCode === item.code ? palette.primary : palette.surfaceMuted }]}>
                <Text style={[Typography.caption, { color: palette.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[Typography.bodySemi, { color: palette.text }]}>Điểm đến ({destinationLabel})</Text>
          <Input value={destinationQuery} onChangeText={setDestinationQuery} placeholder="Tìm điểm đến: Đà Nẵng, Phú Quốc..." />
          <View style={styles.optionsGrid}>
            {destinationOptions.slice(0, 6).map((item, idx) => (
              <Pressable
                key={`destination-${item.code}-${idx}`}
                onPress={() => {
                  setDestinationCode(item.code);
                  setDestinationQuery(item.city);
                }}
                style={[styles.optionChip, { backgroundColor: destinationCode === item.code ? palette.primary : palette.surfaceMuted }]}>
                <Text style={[Typography.caption, { color: palette.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[Typography.bodySemi, { color: palette.text }]}>Ngày bay</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {dateOptions.map((item) => {
              const selected = departureDate === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setDepartureDate(item.value)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: selected ? palette.primary : palette.surfaceMuted,
                      borderColor: selected ? palette.primaryPressed : palette.border,
                    },
                  ]}>
                  <Text style={[Typography.caption, { color: palette.text }]}>{item.label}</Text>
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>{item.value}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button title={loading ? 'Đang tìm...' : 'Tìm chuyến bay'} onPress={handleSearch} loading={loading} size="lg" />
        </Card>

        {error ? <Text style={[Typography.body, { color: palette.danger }]}>{error}</Text> : null}

        <View style={styles.resultsHead}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Kết quả ({offers.length})</Text>
        </View>

        {offers.length === 0 && !loading ? (
          <Card>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>Chưa có kết quả. Bạn hãy tìm chuyến để tiếp tục quy trình đặt vé.</Text>
          </Card>
        ) : null}

        {offers.map((offer) => (
          <Card key={offer.id} style={styles.offerCard}>
            <View style={styles.offerTop}>
              <View style={styles.airlineWrap}>
                {offer.airlineLogo ? (
                  <Image source={{ uri: offer.airlineLogo }} style={styles.airlineLogo} contentFit="contain" />
                ) : (
                  <View style={[styles.airlineLogo, { backgroundColor: palette.surfaceMuted }]} />
                )}
                <Text style={[Typography.bodySemi, { color: palette.text }]}>{offer.airlineName}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.surfaceMuted }]}>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>{offer.segmentsCount} chặng</Text>
              </View>
            </View>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>
              {offer.fromCode} {offer.departAt} → {offer.toCode} {offer.arriveAt}
            </Text>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>Thời lượng: {offer.totalDuration}</Text>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>Giá: {formatMoneyVndFromAny(offer.totalAmount, offer.currency)}</Text>
            <Button
              title="Chọn chuyến này"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/flight-checkout',
                  params: {
                    offerId: offer.id,
                    amount: offer.totalAmount,
                    currency: offer.currency,
                    fromCode: offer.fromCode,
                    toCode: offer.toCode,
                    departAt: offer.departAt,
                    arriveAt: offer.arriveAt,
                    airlineName: offer.airlineName,
                    flightNumber: offer.flightNumber,
                    pnrCode: offer.pnrCode ?? '',
                    departIso: offer.departIso,
                    arriveIso: offer.arriveIso,
                  },
                })
              }
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  formCard: { gap: Spacing.sm },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dateRow: { gap: Spacing.sm },
  dateChip: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minWidth: 120,
  },
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerCard: { gap: Spacing.sm },
  airlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  airlineLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
});
