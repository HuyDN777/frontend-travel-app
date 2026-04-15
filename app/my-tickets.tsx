import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTripBookings } from '@/services/api/bookings';
import type { BookingMasterRes } from '@/types/api';

const DEFAULT_TRIP_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_TRIP_ID ?? '1');

type TicketsTab = 'flight' | 'ground';

function isFlightBooking(b: BookingMasterRes) {
  return (b.category ?? '').toUpperCase() === 'FLIGHT';
}

function paymentStatusVi(status: string | undefined) {
  const u = (status ?? '').toUpperCase();
  if (u === 'PAID') return 'Đã thanh toán';
  if (u === 'PENDING') return 'Chờ thanh toán';
  if (u === 'FAILED') return 'Thanh toán thất bại';
  if (u === 'CANCELLED' || u === 'CANCELED') return 'Đã hủy';
  if (u === 'NOT_REQUIRED') return 'Không thu qua app — thanh toán tại quán';
  return status ?? '—';
}

function groundCategoryLabel(cat: string | undefined) {
  switch ((cat ?? '').toUpperCase()) {
    case 'HOTEL':
      return 'Khách sạn';
    case 'RESTAURANT':
      return 'Nhà hàng';
    case 'COACH':
      return 'Xe / tàu';
    default:
      return 'Đặt chỗ';
  }
}

function fallbackVerifyCode(booking: BookingMasterRes) {
  return booking.verifyCode ?? `BKG-${String(booking.id).padStart(8, '0')}`;
}

function buildQrImageUrl(tripId: number, booking: BookingMasterRes) {
  const code = fallbackVerifyCode(booking);
  const payload = `DULICHAPP|trip=${tripId}|bid=${booking.id}|code=${code}|${(booking.paymentStatus ?? '').toUpperCase()}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(payload)}`;
}

function TicketCard({
  booking,
  palette,
  kind,
}: {
  booking: BookingMasterRes;
  palette: (typeof Colors)[keyof typeof Colors];
  kind: 'flight' | 'ground';
}) {
  const code = fallbackVerifyCode(booking);
  const qrUri = buildQrImageUrl(DEFAULT_TRIP_ID, booking);
  return (
    <Card style={styles.ticketCard}>
      {kind === 'ground' ? (
        <Text style={[Typography.caption, { color: palette.primary }]}>
          {groundCategoryLabel(booking.category)}
        </Text>
      ) : (
        <Text style={[Typography.caption, { color: palette.primary }]}>Chuyến bay</Text>
      )}
      <Text style={[Typography.titleLG, { color: palette.text }]}>{code}</Text>
      <Text style={[Typography.caption, { color: palette.textMuted }]}>Mã đặt chỗ nội bộ: #{booking.id}</Text>
      {booking.summaryTitle ? (
        <Text style={[Typography.bodySemi, { color: palette.text }]}>{booking.summaryTitle}</Text>
      ) : null}
      {booking.summaryDetail ? (
        <Text style={[Typography.caption, { color: palette.textMuted }]}>{booking.summaryDetail}</Text>
      ) : null}
      {(booking.category ?? '').toUpperCase() === 'RESTAURANT' ? (
        <Text style={[Typography.caption, { color: palette.warning, lineHeight: 20 }]}>
          Chưa xác nhận còn bàn — nên gọi/nhắn quán trước khi đi.
        </Text>
      ) : null}
      <Text style={[Typography.caption, { color: palette.textMuted }]}>
        Trạng thái: {paymentStatusVi(booking.paymentStatus)}
      </Text>
      {booking.totalAmount != null && booking.totalAmount > 0 ? (
        <Text style={[Typography.bodySemi, { color: palette.text }]}>
          Tổng tiền:{' '}
          {new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
          }).format(booking.totalAmount)}
        </Text>
      ) : (
        <Text style={[Typography.caption, { color: palette.textMuted }]}>
          Không thu tiền qua app cho vé này.
        </Text>
      )}

      <View style={[styles.qrBox, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[Typography.caption, { color: palette.textMuted, marginBottom: Spacing.sm }]}>
          QR cho nhân viên quét
        </Text>
        <Image source={{ uri: qrUri }} style={styles.qrImg} contentFit="contain" />
      </View>
    </Card>
  );
}

export default function MyTicketsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TicketsTab>('flight');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingMasterRes[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTripBookings(DEFAULT_TRIP_ID);
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách vé.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const paidBookings = useMemo(
    () => bookings.filter((item) => (item.paymentStatus ?? '').toUpperCase() === 'PAID'),
    [bookings]
  );

  const flightTickets = useMemo(() => paidBookings.filter(isFlightBooking), [paidBookings]);
  const groundTickets = useMemo(() => paidBookings.filter((b) => !isFlightBooking(b)), [paidBookings]);

  const visibleList = tab === 'flight' ? flightTickets : groundTickets;

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerRow}>
          <Text style={[Typography.titleLG, { color: palette.text }]}>Vé & mã xác nhận</Text>
          <Button
            title={loading ? 'Đang tải...' : 'Làm mới'}
            onPress={refresh}
            loading={loading}
            variant="secondary"
          />
        </View>

        <View style={[styles.tabBar, { backgroundColor: palette.surfaceMuted }]}>
          <Pressable
            onPress={() => setTab('flight')}
            style={[
              styles.tabBtn,
              tab === 'flight' && { backgroundColor: palette.surface },
              tab === 'flight' && styles.tabBtnActive,
              { borderColor: tab === 'flight' ? palette.primary : 'transparent' },
            ]}>
            <Text
              style={[
                Typography.bodySemi,
                { color: tab === 'flight' ? palette.text : palette.textMuted },
              ]}>
              Chuyến bay ({flightTickets.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('ground')}
            style={[
              styles.tabBtn,
              tab === 'ground' && { backgroundColor: palette.surface },
              tab === 'ground' && styles.tabBtnActive,
              { borderColor: tab === 'ground' ? palette.primary : 'transparent' },
            ]}>
            <Text
              style={[
                Typography.bodySemi,
                { color: tab === 'ground' ? palette.text : palette.textMuted },
              ]}>
              Khách sạn & đặt chỗ ({groundTickets.length})
            </Text>
          </Pressable>
        </View>
        <Text style={[Typography.caption, { color: palette.textMuted }]}>
          {tab === 'flight' ? 'Vé máy bay đã thanh toán.' : 'Khách sạn, nhà hàng, xe/tàu và đặt chỗ khác.'}
        </Text>

        <Card style={styles.hintCard}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Cách dùng</Text>
          <Text style={[Typography.caption, { color: palette.textMuted, lineHeight: 20 }]}>
            Sau khi thanh toán, đưa mã hoặc QR cho đối tác để đối soát (bản demo).
          </Text>
        </Card>

        {error ? <Text style={[Typography.caption, { color: palette.danger }]}>{error}</Text> : null}

        {!loading && visibleList.length === 0 ? (
          <Card>
            <Text style={[Typography.body, { color: palette.textMuted }]}>
              {tab === 'flight'
                ? 'Chưa có vé máy bay đã thanh toán.'
                : 'Chưa có khách sạn / nhà hàng / xe đã thanh toán.'}
            </Text>
          </Card>
        ) : null}

        {visibleList.map((booking) => (
          <TicketCard key={booking.id} booking={booking} palette={palette} kind={tab} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabBtnActive: {
    ...Elevation.card,
  },
  hintCard: {
    gap: Spacing.sm,
  },
  ticketCard: {
    gap: Spacing.sm,
  },
  qrBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  qrImg: {
    width: 220,
    height: 220,
  },
});
