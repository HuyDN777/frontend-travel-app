import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserBookings } from '@/services/api/bookings';
import type { BookingMasterRes } from '@/types/api';
import { getSessionUserId } from '@/utils/session';

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

function fallbackVerifyCode(booking: BookingMasterRes) {
  return booking.verifyCode ?? `BKG-${String(booking.id).padStart(8, '0')}`;
}

function buildQrImageUrl(booking: BookingMasterRes) {
  const tripCode = booking.tripId ?? 0;
  const code = fallbackVerifyCode(booking);
  const payload = `DULICHAPP|trip=${tripCode}|bid=${booking.id}|code=${code}|${(booking.paymentStatus ?? '').toUpperCase()}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(payload)}`;
}

function TicketCard({
  booking,
  palette,
}: {
  booking: BookingMasterRes;
  palette: (typeof Colors)[keyof typeof Colors];
}) {
  const code = fallbackVerifyCode(booking);
  const qrUri = buildQrImageUrl(booking);
  return (
    <Card style={styles.ticketCard}>
      <Text style={[Typography.caption, { color: palette.primary }]}>Chuyến bay</Text>
      <Text style={[Typography.titleLG, { color: palette.text }]}>{code}</Text>
      {booking.summaryTitle ? (
        <Text style={[Typography.bodySemi, { color: palette.text }]}>{booking.summaryTitle}</Text>
      ) : null}
      {booking.summaryDetail ? (
        <Text style={[Typography.caption, { color: palette.textMuted }]}>{booking.summaryDetail}</Text>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingMasterRes[]>([]);

  const refresh = useCallback(async () => {
    const userId = getSessionUserId();
    if (!userId) {
      setError('Bạn cần đăng nhập lại để xem vé.');
      setBookings([]);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await getUserBookings(userId);
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

        <Text style={[Typography.caption, { color: palette.textMuted }]}>
          Vé máy bay đã thanh toán.
        </Text>

        {error ? <Text style={[Typography.caption, { color: palette.danger }]}>{error}</Text> : null}

        {!loading && flightTickets.length === 0 ? (
          <Card>
            <Text style={[Typography.body, { color: palette.textMuted }]}>
              Chưa có vé máy bay đã thanh toán.
            </Text>
          </Card>
        ) : null}

        {flightTickets.map((booking) => (
          <TicketCard key={booking.id} booking={booking} palette={palette} />
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
