import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiRequest } from '@/services/api/http';

type BusSearchItem = {
  title: string;
  snippet: string;
  link: string;
};

type BusSearchRes = {
  query: string;
  items: BusSearchItem[];
};

export default function TransportScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [from, setFrom] = useState('TP.HCM');
  const [to, setTo] = useState('Đà Nẵng');
  const [dateYmd, setDateYmd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<BusSearchItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingLink, setOpeningLink] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!from.trim() || !to.trim() || !dateYmd.trim()) {
      setError('Vui lòng nhập điểm đi, điểm đến và ngày đi.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd.trim())) {
      setError('Ngày đi cần đúng định dạng YYYY-MM-DD.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<BusSearchRes>('/bus/search', {
        method: 'GET',
        query: {
          from: from.trim(),
          to: to.trim(),
          departureDate: dateYmd.trim(),
          limit: 12,
        },
      });
      setResults(data.items ?? []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tìm vé xe lúc này.');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPartner = async (item: BusSearchItem) => {
    setOpeningLink(item.link);
    try {
      await WebBrowser.openBrowserAsync(item.link);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được link đối tác.');
    } finally {
      setOpeningLink(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Tra cứu tuyến xe khách</Text>
          <Input label="Điểm đi" value={from} onChangeText={setFrom} placeholder="VD: TP.HCM" />
          <Input label="Điểm đến" value={to} onChangeText={setTo} placeholder="VD: Đà Nẵng" />
          <Input label="Ngày đi" value={dateYmd} onChangeText={setDateYmd} placeholder="YYYY-MM-DD" />
          {error ? <Text style={[Typography.caption, { color: palette.danger }]}>{error}</Text> : null}
          <Button title={loading ? 'Đang tìm...' : 'Tìm kiếm'} onPress={() => void handleSearch()} disabled={loading} />
        </Card>

        {searched ? (
          <Card style={styles.card}>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>Kết quả tìm kiếm</Text>
            {results.length === 0 ? (
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Không có chuyến phù hợp.</Text>
            ) : (
              results.map((item) => (
                <View key={item.link} style={[styles.resultItem, { borderColor: palette.border }]}>
                  <Text style={[Typography.bodySemi, { color: palette.text }]}>{item.title}</Text>
                  <Text style={[Typography.caption, { color: palette.textMuted }]} numberOfLines={3}>
                    {item.snippet || 'Không có mô tả.'}
                  </Text>
                  <Button
                    title={openingLink === item.link ? 'Đang mở...' : 'Xem thông tin đối tác'}
                    variant="secondary"
                    onPress={() => void handleOpenPartner(item)}
                    disabled={openingLink === item.link}
                  />
                </View>
              ))
            )}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },
  card: { gap: Spacing.sm, borderRadius: Radius.lg },
  resultItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
