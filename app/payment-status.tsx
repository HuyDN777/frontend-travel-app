import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTripBookings } from '@/services/api/bookings';

type PaymentState = 'PENDING' | 'PAID' | 'FAILED' | 'UNKNOWN';

export default function PaymentStatusScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ tripId?: string; bookingId?: string; status?: string }>();

  const tripId = Number(params.tripId ?? 0);
  const bookingId = Number(params.bookingId ?? 0);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentState>('UNKNOWN');
  const [message, setMessage] = useState('Đang chờ cập nhật từ cổng thanh toán.');

  useEffect(() => {
    const raw = (params.status ?? '').toUpperCase();
    if (raw === 'PAID' || raw === 'FAILED' || raw === 'PENDING') {
      setStatus(raw as PaymentState);
    }
  }, [params.status]);

  const refreshStatus = useCallback(async () => {
    if (!tripId || !bookingId) {
      setStatus('UNKNOWN');
      setMessage('Thiếu thông tin đơn đặt chỗ.');
      return;
    }
    try {
      setLoading(true);
      const bookings = await getTripBookings(tripId);
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) {
        setStatus('UNKNOWN');
        setMessage('Không tìm thấy booking trong chuyến đi.');
        return;
      }

      const paymentStatus = (booking.paymentStatus || '').toUpperCase();
      if (paymentStatus === 'PAID') {
        setStatus('PAID');
        setMessage('Thanh toán thành công. Vé sẽ được xác nhận trong ít phút.');
      } else if (paymentStatus === 'FAILED') {
        setStatus('FAILED');
        setMessage('Thanh toán thất bại. Bạn có thể thử lại với phương thức khác.');
      } else {
        setStatus('PENDING');
        setMessage('Giao dịch đang xử lý. Vui lòng kiểm tra lại sau ít phút.');
      }
    } catch (e) {
      setStatus('UNKNOWN');
      setMessage(e instanceof Error ? e.message : 'Không thể kiểm tra trạng thái thanh toán.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, tripId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const statusColor = useMemo(() => {
    if (status === 'PAID') return palette.success;
    if (status === 'FAILED') return palette.danger;
    if (status === 'PENDING') return palette.warning;
    return palette.textMuted;
  }, [palette, status]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Mã booking: {bookingId || '--'}</Text>
          <Text style={[Typography.bodySemi, { color: statusColor }]}>Trạng thái: {status}</Text>
          <Text style={[Typography.body, { color: palette.textMuted }]}>{message}</Text>
          <Button
            title={loading ? 'Đang kiểm tra...' : 'Kiểm tra lại trạng thái'}
            onPress={refreshStatus}
            loading={loading}
          />
          <Button title="Xem vé của tôi" variant="ghost" onPress={() => router.push('/my-tickets')} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: Spacing.lg,
  },
  card: {
    gap: Spacing.md,
  },
});
