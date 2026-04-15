import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

function mapFlightSearchError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/duffel|Duffel|travel\.flight/i.test(raw) && /api-key|api key|cấu hình|Chua cau hinh/i.test(raw)) {
    return 'Backend chưa có khóa Duffel. Tạo application-local.yaml (xem application-local.example) hoặc set DUFFEL_API_KEY; chạy backend profile dev (PowerShell: mvn spring-boot:run "-Dspring-boot.run.profiles=dev")';
  }
  return raw || 'Không thể tìm chuyến bay';
}

/** Web: chặn mất focus ô nhập trước khi chip nhận click (nếu không, blur ẩn list và onPress không chạy). */
function preventWebAutocompleteBlur(e: any) {
  if (Platform.OS !== 'web') return;
  e.preventDefault?.();
  e.nativeEvent?.preventDefault?.();
}

const webBlockInputBlurProps: any =
  Platform.OS === 'web'
    ? ({
        onMouseDown: (e: any) => e.preventDefault(),
        onPointerDown: preventWebAutocompleteBlur,
        onPointerDownCapture: preventWebAutocompleteBlur,
      } as const)
    : {};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Gợi ý sân bay: không dùng alias kiểu "vinh long".includes("vinh") — trùng logic detectCodeFromQuery. */
function filterAirportSuggestions(query: string, excludeCode?: string): AirportOption[] {
  const nq = normalizeText(query);
  const byCode = new Map<string, { opt: AirportOption; rank: number }>();

  const add = (opt: AirportOption, rank: number) => {
    if (excludeCode && opt.code === excludeCode) return;
    const prev = byCode.get(opt.code);
    if (!prev || rank < prev.rank) byCode.set(opt.code, { opt, rank });
  };

  if (!nq) {
    for (const code of ['SGN', 'HAN', 'DAD', 'VII', 'VCA', 'PQC', 'CXR', 'HPH']) {
      const o = AIRPORT_OPTIONS.find((a) => a.code === code);
      if (o) add(o, 10);
    }
    return Array.from(byCode.values())
      .sort((a, b) => a.rank - b.rank || a.opt.label.localeCompare(b.opt.label, 'vi'))
      .map((x) => x.opt);
  }

  for (const item of AIRPORT_OPTIONS) {
    const city = normalizeText(item.city);
    const label = normalizeText(item.label);
    if (city === nq || label === nq) add(item, 0);
    else if ((item.aliases ?? []).some((a) => normalizeText(a) === nq)) add(item, 1);
    else if (city.startsWith(nq) || label.startsWith(nq)) add(item, 2);
    else if (city.includes(nq) || label.includes(nq)) add(item, 3);
    else if (nq.includes(' ') && (item.aliases ?? []).some((a) => normalizeText(a).startsWith(nq))) add(item, 4);
  }

  const raw = query.trim().toUpperCase();
  if (raw && /^[A-Z]{1,3}$/.test(raw)) {
    for (const item of AIRPORT_OPTIONS) {
      if (item.code.startsWith(raw)) add(item, item.code === raw ? 0 : 5);
    }
  }

  for (const [key, code] of Object.entries(LOCATION_ALIAS_TO_CODE)) {
    const nk = normalizeText(key);
    if (nk === nq) {
      const o = AIRPORT_OPTIONS.find((a) => a.code === code);
      if (o) add(o, 1);
    } else if (nq.includes(' ') && nk.startsWith(nq)) {
      const o = AIRPORT_OPTIONS.find((a) => a.code === code);
      if (o) add(o, 6);
    }
  }

  return Array.from(byCode.values())
    .sort((a, b) => a.rank - b.rank || a.opt.label.localeCompare(b.opt.label, 'vi'))
    .map((x) => x.opt)
    .slice(0, 16);
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
  const [originFocused, setOriginFocused] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const blurOriginTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurDestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurOriginTimer.current) clearTimeout(blurOriginTimer.current);
      if (blurDestTimer.current) clearTimeout(blurDestTimer.current);
    };
  }, []);

  const offers = useMemo(() => normalizeOffers(raw), [raw]);

  const originSuggestions = useMemo(
    () => filterAirportSuggestions(originQuery, destinationCode),
    [originQuery, destinationCode]
  );
  const destinationSuggestions = useMemo(
    () => filterAirportSuggestions(destinationQuery, originCode),
    [destinationQuery, originCode]
  );

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
    // Không dùng .includes() trên aliases: ví dụ alias "vinh long" (Cần Thơ) chứa "vinh" → nhầm với sân bay Vinh (VII).
    const partial = AIRPORT_OPTIONS.find(
      (item) =>
        normalizeText(item.city).includes(normalizedQuery) || normalizeText(item.label).includes(normalizedQuery)
    );
    if (partial) return partial.code;

    // Alias chỉ khớp từng từ khi gõ đủ (exact), hoặc khi query có dấu cách (vd. "vinh long", "vinh l").
    const aliasMatch = AIRPORT_OPTIONS.find((item) =>
      (item.aliases ?? []).some((alias) => {
        const a = normalizeText(alias);
        if (a === normalizedQuery) return true;
        if (!normalizedQuery.includes(' ')) return false;
        return a.startsWith(normalizedQuery);
      })
    );
    if (aliasMatch) return aliasMatch.code;
    const rawCode = query.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(rawCode)) return rawCode;
    return null;
  };

  const handleSearch = async () => {
    const effectiveOrigin = detectCodeFromQuery(originQuery);
    const effectiveDestination = detectCodeFromQuery(destinationQuery);
    if (!effectiveOrigin) {
      setError('Không nhận diện được điểm đi. Nhập tên thành phố hoặc mã IATA (ví dụ SGN).');
      return;
    }
    if (!effectiveDestination) {
      setError('Không nhận diện được điểm đến. Nhập tên thành phố hoặc mã IATA (ví dụ HAN).');
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
        setError(mapFlightSearchError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[Typography.titleLG, { color: palette.text }]}>Đặt chuyến bay</Text>

        <Card style={styles.formCard}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Điểm đi ({originLabel})</Text>
          <Input
            value={originQuery}
            onChangeText={setOriginQuery}
            placeholder="Điểm đi: TP.HCM, Hà Nội hoặc mã SGN..."
            onFocus={() => {
              if (blurOriginTimer.current) clearTimeout(blurOriginTimer.current);
              setDestinationFocused(false);
              setOriginFocused(true);
            }}
            onBlur={() => {
              blurOriginTimer.current = setTimeout(() => setOriginFocused(false), 280);
            }}
          />
          {originFocused && originSuggestions.length > 0 ? (
            <View {...webBlockInputBlurProps}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.suggestionRow}>
                {originSuggestions.map((item) => {
                  const selected = item.code === originCode;
                  return (
                    <Pressable
                      key={`o-${item.code}`}
                      onPress={() => {
                        if (blurOriginTimer.current) clearTimeout(blurOriginTimer.current);
                        setOriginQuery(item.label);
                        setOriginCode(item.code);
                        setOriginFocused(false);
                      }}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: selected ? palette.primary : palette.surfaceMuted,
                        borderColor: selected ? palette.primaryPressed : palette.border,
                      },
                    ]}>
                      <Text style={[Typography.caption, { color: palette.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Text style={[Typography.bodySemi, { color: palette.text }]}>Điểm đến ({destinationLabel})</Text>
          <Input
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            placeholder="Điểm đến: Đà Nẵng, Phú Quốc hoặc HAN..."
            onFocus={() => {
              if (blurDestTimer.current) clearTimeout(blurDestTimer.current);
              setOriginFocused(false);
              setDestinationFocused(true);
            }}
            onBlur={() => {
              blurDestTimer.current = setTimeout(() => setDestinationFocused(false), 280);
            }}
          />
          {destinationFocused && destinationSuggestions.length > 0 ? (
            <View {...webBlockInputBlurProps}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.suggestionRow}>
                {destinationSuggestions.map((item) => {
                  const selected = item.code === destinationCode;
                  return (
                    <Pressable
                      key={`d-${item.code}`}
                      onPress={() => {
                        if (blurDestTimer.current) clearTimeout(blurDestTimer.current);
                        setDestinationQuery(item.label);
                        setDestinationCode(item.code);
                        setDestinationFocused(false);
                      }}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: selected ? palette.primary : palette.surfaceMuted,
                        borderColor: selected ? palette.primaryPressed : palette.border,
                      },
                    ]}>
                      <Text style={[Typography.caption, { color: palette.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
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
        <Text style={[Typography.caption, { color: palette.textMuted }]}>
          Giá và chỗ phản ánh thời điểm bạn bấm tìm; offer có thể hết hạn hoặc đổi nếu để lâu.
        </Text>

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
  suggestionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    maxHeight: 44,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: 200,
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
