import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTripBookings } from '@/services/api/bookings';
import type { BookingMasterRes } from '@/types/api';

const DEFAULT_TRIP_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_TRIP_ID ?? '1');

function toTicketCode(bookingId: number) {
  return `ETKT-${String(bookingId).padStart(8, '0')}`;
}

export default function MyTicketsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[Typography.titleLG, { color: palette.text }]}>Vé của tôi</Text>
          <Button
            title={loading ? 'Đang tải...' : 'Làm mới'}
            onPress={refresh}
            loading={loading}
            variant="secondary"
          />
        </View>

        {error ? <Text style={[Typography.caption, { color: palette.danger }]}>{error}</Text> : null}

        {paidBookings.length === 0 && !loading ? (
          <Card>
            <Text style={[Typography.body, { color: palette.textMuted }]}>
              Chưa có vé đã thanh toán trong chuyến đi hiện tại.
            </Text>
          </Card>
        ) : null}

        {paidBookings.map((booking) => (
          <Card key={booking.id} style={styles.ticketCard}>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>Mã vé: {toTicketCode(booking.id)}</Text>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>Booking: #{booking.id}</Text>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>
              Trạng thái: {booking.paymentStatus}
            </Text>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>
              Tổng tiền: {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
              }).format(booking.totalAmount ?? 0)}
            </Text>
            <View style={[styles.qrPlaceholder, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Mã xác nhận lên tàu bay (QR) sẽ hiển thị sau bước check-in online.</Text>
            </View>
          </Card>
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
    paddingTop: Spacing.lg,
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
  qrPlaceholder: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
});
