import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createFlightBooking } from '@/services/api/bookings';
import { priceFlightOffer } from '@/services/api/flights';
import { API_BASE_URL } from '@/services/api/http';
import { initiatePayment } from '@/services/api/payments';

type BookingExtras = {
  baggageKg: 0 | 15 | 20;
  seatPreference: 'window' | 'aisle' | 'middle';
  insurance: boolean;
};

type PassengerInfo = {
  fullName: string;
  dateOfBirth: string;
  documentId: string;
  email: string;
  phone: string;
};

const USD_TO_VND_RATE = 26000;
const DEFAULT_TRIP_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_TRIP_ID ?? '1');
const DEFAULT_USER_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '1');
const BAGGAGE_PRICE_VND: Record<BookingExtras['baggageKg'], number> = { 0: 0, 15: 250000, 20: 350000 };
const INSURANCE_PRICE_VND = 49000;

function getBackendOrigin() {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:8080';
  }
}

function toVndAmount(amountText: string, currency: string) {
  const amount = Number(amountText);
  if (!Number.isFinite(amount)) return 0;
  return currency.toUpperCase() === 'VND' ? amount : amount * USD_TO_VND_RATE;
}

function formatMoneyVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function extractOfferPrice(payload: unknown): { amount: string; currency: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, any>;
  const data = root.data as Record<string, any> | undefined;
  const target = Array.isArray(data) ? data[0] : data ?? root;
  const amount = target?.total_amount ?? target?.totalAmount;
  const currency = target?.total_currency ?? target?.currency ?? 'USD';
  if (!amount) return null;
  return { amount: String(amount), currency: String(currency) };
}

function mapApiErrorMessage(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as {
      errors?: Array<{ code?: string; title?: string; message?: string }>;
    };
    const code = parsed.errors?.[0]?.code;
    if (code === 'offer_no_longer_available') {
      return 'Giá vé này vừa thay đổi hoặc đã hết. Vui lòng quay lại chọn chuyến khác rồi kiểm tra giá lại.';
    }
  } catch {
    // Keep original message if not JSON.
  }
  return rawMessage;
}

export default function FlightCheckoutScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{
    offerId?: string;
    amount?: string;
    currency?: string;
    fromCode?: string;
    toCode?: string;
    departAt?: string;
    arriveAt?: string;
    airlineName?: string;
    flightNumber?: string;
    pnrCode?: string;
    departIso?: string;
    arriveIso?: string;
  }>();

  const [passenger, setPassenger] = useState<PassengerInfo>({
    fullName: '',
    dateOfBirth: '',
    documentId: '',
    email: '',
    phone: '',
  });
  const [extras, setExtras] = useState<BookingExtras>({
    baggageKg: 0,
    seatPreference: 'window',
    insurance: false,
  });
  const [paymentProvider, setPaymentProvider] = useState<'VNPAY' | 'MOMO'>('VNPAY');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifiedPrice, setVerifiedPrice] = useState<{ amount: string; currency: string } | null>(null);
  const [error, setError] = useState('');
  const [offerExpired, setOfferExpired] = useState(false);

  const baseAmount = useMemo(
    () =>
      toVndAmount(verifiedPrice?.amount ?? params.amount ?? '0', verifiedPrice?.currency ?? params.currency ?? 'VND'),
    [params.amount, params.currency, verifiedPrice]
  );
  const finalAmount = useMemo(
    () => baseAmount + BAGGAGE_PRICE_VND[extras.baggageKg] + (extras.insurance ? INSURANCE_PRICE_VND : 0),
    [baseAmount, extras]
  );

  const validatePassenger = () => {
    if (!passenger.fullName.trim()) return 'Vui lòng nhập họ và tên hành khách.';
    if (!passenger.dateOfBirth.trim()) return 'Vui lòng nhập ngày sinh (YYYY-MM-DD).';
    if (!passenger.documentId.trim()) return 'Vui lòng nhập số giấy tờ tùy thân.';
    if (!passenger.email.trim() || !passenger.email.includes('@')) return 'Email hành khách chưa hợp lệ.';
    if (!passenger.phone.trim() || passenger.phone.trim().length < 9) return 'Số điện thoại chưa hợp lệ.';
    return '';
  };

  const handleRecheckPrice = async () => {
    if (!params.offerId) return;
    const validationError = validatePassenger();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setPricingLoading(true);
      setError('');
      setOfferExpired(false);
      const repriced = await priceFlightOffer({ id: params.offerId });
      const extracted = extractOfferPrice(repriced);
      if (!extracted) {
        setError('Không đọc được giá mới từ hệ thống.');
        return;
      }
      setVerifiedPrice(extracted);
    } catch (e) {
      const message = e instanceof Error ? mapApiErrorMessage(e.message) : 'Không thể kiểm tra lại giá.';
      setError(message);
      if (message.includes('đã hết') || message.includes('không còn')) {
        setOfferExpired(true);
      }
    } finally {
      setPricingLoading(false);
    }
  };

  const toTimeOnly = (dateTime?: string) => {
    if (!dateTime) return '00:00:00';
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return dateTime.split('T')[1]?.slice(0, 8) || '00:00:00';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
  };

  const handlePay = async () => {
    if (!verifiedPrice) {
      setError('Vui lòng kiểm tra lại giá trước khi thanh toán.');
      return;
    }
    try {
      setOfferExpired(false);
      setCheckoutLoading(true);
      setError('');
      const booking = await createFlightBooking(DEFAULT_TRIP_ID, {
        userId: DEFAULT_USER_ID,
        totalAmount: finalAmount,
        paymentStatus: 'PENDING',
        pnrCode: params.pnrCode || undefined,
        flightNumber: params.flightNumber || 'N/A',
        departureAirport: params.fromCode || 'N/A',
        arrivalAirport: params.toCode || 'N/A',
        departureTime: toTimeOnly(params.departIso),
        arrivalTime: toTimeOnly(params.arriveIso),
      });

      const payment = await initiatePayment(DEFAULT_TRIP_ID, booking.id, {
        provider: paymentProvider,
        amount: finalAmount,
        orderInfo: `Thanh toán vé ${params.fromCode}-${params.toCode}`,
        returnUrl: `${getBackendOrigin()}/api/v1/payments/vnpay/callback?appReturnUrl=${encodeURIComponent(
          Linking.createURL('/payment-status')
        )}&tripId=${DEFAULT_TRIP_ID}&bookingId=${booking.id}`,
        ipnUrl: `${getBackendOrigin()}/api/v1/payments/vnpay/ipn`,
      });

      if (payment.paymentUrl) {
        const appReturnUrl = Linking.createURL('/payment-status');
        const authResult = await WebBrowser.openAuthSessionAsync(payment.paymentUrl, appReturnUrl);
        if (authResult.type === 'success' && authResult.url) {
          const parsed = Linking.parse(authResult.url);
          const queryParams = parsed.queryParams ?? {};
          router.replace({
            pathname: '/payment-status',
            params: {
              tripId: String(queryParams.tripId ?? DEFAULT_TRIP_ID),
              bookingId: String(queryParams.bookingId ?? booking.id),
              status: String(queryParams.status ?? ''),
            },
          });
          return;
        }
      }
      router.push({
        pathname: '/payment-status',
        params: { tripId: String(DEFAULT_TRIP_ID), bookingId: String(booking.id) },
      });
    } catch (e) {
      const message = e instanceof Error ? mapApiErrorMessage(e.message) : 'Không thể thanh toán.';
      setError(message);
      if (message.includes('đã hết') || message.includes('không còn')) {
        setOfferExpired(true);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Thông tin chuyến bay</Text>
          <Text style={[Typography.caption, { color: palette.textMuted }]}>
            Chặng: {params.fromCode} {params.departAt} → {params.toCode} {params.arriveAt}
          </Text>
          <Text style={[Typography.caption, { color: palette.textMuted }]}>Hãng: {params.airlineName}</Text>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Giá vé: {formatMoneyVnd(baseAmount)}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Thông tin hành khách</Text>
          <Input value={passenger.fullName} onChangeText={(v) => setPassenger((p) => ({ ...p, fullName: v }))} placeholder="Họ và tên" />
          <Input value={passenger.dateOfBirth} onChangeText={(v) => setPassenger((p) => ({ ...p, dateOfBirth: v }))} placeholder="Ngày sinh (YYYY-MM-DD)" />
          <Input value={passenger.documentId} onChangeText={(v) => setPassenger((p) => ({ ...p, documentId: v }))} placeholder="CCCD/Passport" />
          <Input value={passenger.email} onChangeText={(v) => setPassenger((p) => ({ ...p, email: v }))} placeholder="Email" autoCapitalize="none" />
          <Input value={passenger.phone} onChangeText={(v) => setPassenger((p) => ({ ...p, phone: v }))} placeholder="Số điện thoại" keyboardType="phone-pad" />
        </Card>

        <Card style={styles.section}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Dịch vụ bổ sung</Text>
          <View style={styles.row}>
            {[0, 15, 20].map((kg) => (
              <Pressable key={kg} onPress={() => setExtras((p) => ({ ...p, baggageKg: kg as 0 | 15 | 20 }))} style={[styles.chip, { backgroundColor: extras.baggageKg === kg ? palette.primary : palette.surfaceMuted }]}>
                <Text style={[Typography.caption, { color: palette.text }]}>{kg}kg</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            {[
              { key: 'window', label: 'Ghế cửa sổ' },
              { key: 'aisle', label: 'Ghế lối đi' },
              { key: 'middle', label: 'Ghế giữa' },
            ].map((seat) => (
              <Pressable key={seat.key} onPress={() => setExtras((p) => ({ ...p, seatPreference: seat.key as BookingExtras['seatPreference'] }))} style={[styles.chip, { backgroundColor: extras.seatPreference === seat.key ? palette.primary : palette.surfaceMuted }]}>
                <Text style={[Typography.caption, { color: palette.text }]}>{seat.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setExtras((p) => ({ ...p, insurance: !p.insurance }))} style={[styles.chip, { backgroundColor: extras.insurance ? palette.primary : palette.surfaceMuted }]}>
            <Text style={[Typography.caption, { color: palette.text }]}>Bảo hiểm (+49.000 đ)</Text>
          </Pressable>
        </Card>

        <Card style={styles.section}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Điều kiện vé</Text>
          <Text style={[Typography.caption, { color: palette.textMuted }]}>Đổi vé trước 24h, áp dụng phí và chênh lệch giá.</Text>
          <Text style={[Typography.caption, { color: palette.textMuted }]}>Không hoàn vé sau khi đã xuất vé.</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Tổng thanh toán: {formatMoneyVnd(finalAmount)}</Text>
          <Button title={pricingLoading ? 'Đang kiểm tra giá...' : 'Kiểm tra lại giá'} onPress={handleRecheckPrice} loading={pricingLoading} variant="secondary" />
          {verifiedPrice ? (
            <Text style={[Typography.caption, { color: palette.success }]}>Đã kiểm tra giá thành công.</Text>
          ) : null}
          <View style={styles.row}>
            <Pressable onPress={() => setPaymentProvider('VNPAY')} style={[styles.chip, { backgroundColor: paymentProvider === 'VNPAY' ? palette.primary : palette.surfaceMuted }]}>
              <Text style={[Typography.caption, { color: palette.text }]}>VNPay</Text>
            </Pressable>
            <Pressable onPress={() => setPaymentProvider('MOMO')} style={[styles.chip, { backgroundColor: paymentProvider === 'MOMO' ? palette.primary : palette.surfaceMuted }]}>
              <Text style={[Typography.caption, { color: palette.text }]}>MoMo</Text>
            </Pressable>
          </View>
          {error ? <Text style={[Typography.caption, { color: palette.danger }]}>{error}</Text> : null}
          {offerExpired ? (
            <Button title="Quay lại chọn chuyến khác" variant="ghost" onPress={() => router.back()} />
          ) : null}
          <Button title={checkoutLoading ? 'Đang tạo thanh toán...' : 'Tiếp tục thanh toán'} onPress={handlePay} loading={checkoutLoading} disabled={!verifiedPrice} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
