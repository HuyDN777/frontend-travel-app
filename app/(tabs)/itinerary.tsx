import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTrip } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VI_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function parseDate(s: string): Date {
    return new Date(s + 'T00:00:00');
}

function getDayCount(start: string, end: string): number {
    return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000) + 1;
}

function getWeekday(start: string, offset: number): string {
    const d = parseDate(start);
    d.setDate(d.getDate() + offset);
    return VI_WEEKDAYS[d.getDay()];
}

function formatDateVN(s: string): string {
    const d = parseDate(s);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ─── Places library ──────────────────────────────────────────────────────────

type PlaceType = 'sight' | 'food' | 'nature' | 'culture' | 'shopping';

interface Place {
    id: string;
    name: string;
    description: string;
    image: string;
    type: PlaceType;
    suggestTime: string;
}

const PLACE_DB: Record<string, Place[]> = {
    'hà nội': [
        { id: 'hn1', name: 'Hồ Hoàn Kiếm', description: 'Hồ nước đẹp trung tâm Hà Nội với đền Ngọc Sơn.', image: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80', type: 'sight', suggestTime: '08:00' },
        { id: 'hn2', name: 'Phố cổ Hà Nội', description: '36 phố phường với kiến trúc cổ xưa đặc sắc.', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80', type: 'culture', suggestTime: '09:30' },
        { id: 'hn3', name: 'Lăng Chủ tịch Hồ Chí Minh', description: 'Di tích lịch sử trọng điểm quốc gia.', image: 'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=400&q=80', type: 'sight', suggestTime: '07:30' },
        { id: 'hn4', name: 'Chợ Đồng Xuân', description: 'Khu chợ sầm uất nhất Hà Nội, mua sắm đặc sản.', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', type: 'shopping', suggestTime: '10:00' },
        { id: 'hn5', name: 'Bún chả Hương Liên', description: 'Quán bún chả nổi tiếng từng đón Obama.', image: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=400&q=80', type: 'food', suggestTime: '12:00' },
        { id: 'hn6', name: 'Văn Miếu – Quốc Tử Giám', description: 'Trường đại học đầu tiên của Việt Nam.', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80', type: 'culture', suggestTime: '14:00' },
    ],
    'đà nẵng': [
        { id: 'dn1', name: 'Cầu Rồng', description: 'Biểu tượng của thành phố Đà Nẵng hiện đại.', image: 'https://images.unsplash.com/photo-1548574505-5e239809f9e0?w=400&q=80', type: 'sight', suggestTime: '18:00' },
        { id: 'dn2', name: 'Bãi biển Mỹ Khê', description: 'Bãi biển đẹp nhất miền Trung Việt Nam.', image: 'https://images.unsplash.com/photo-1559628233-100c798642d5?w=400&q=80', type: 'nature', suggestTime: '07:00' },
        { id: 'dn3', name: 'Bà Nà Hills', description: 'Khu du lịch trên đỉnh núi với Cầu Vàng nổi tiếng.', image: 'https://images.unsplash.com/photo-1604138601229-8c9c2e7c1ca6?w=400&q=80', type: 'sight', suggestTime: '09:00' },
        { id: 'dn4', name: 'Chợ Hàn', description: 'Chợ truyền thống với đặc sản hải sản tươi ngon.', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', type: 'shopping', suggestTime: '08:00' },
        { id: 'dn5', name: 'Mì Quảng Ếch', description: 'Thử mì Quảng đặc sản nổi tiếng nhất miền Trung.', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', type: 'food', suggestTime: '11:30' },
        { id: 'dn6', name: 'Ngũ Hành Sơn', description: 'Quần thể núi đá vôi huyền bí với hang động, chùa chiền.', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', type: 'nature', suggestTime: '14:00' },
    ],
    'hội an': [
        { id: 'ha1', name: 'Phố cổ Hội An', description: 'Di sản văn hóa UNESCO với đèn lồng rực rỡ.', image: 'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=400&q=80', type: 'culture', suggestTime: '08:00' },
        { id: 'ha2', name: 'Chùa Cầu Nhật Bản', description: 'Biểu tượng lịch sử của Hội An hơn 400 năm.', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80', type: 'sight', suggestTime: '09:00' },
        { id: 'ha3', name: 'Cao lầu Hội An', description: 'Món đặc sản chỉ có ở Hội An.', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', type: 'food', suggestTime: '12:00' },
        { id: 'ha4', name: 'Làng nghề gốm Thanh Hà', description: 'Tham quan và tự tay làm gốm truyền thống.', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80', type: 'culture', suggestTime: '14:00' },
        { id: 'ha5', name: 'Bãi biển An Bàng', description: 'Bãi biển yên tĩnh, trong xanh cách phố cổ 4km.', image: 'https://images.unsplash.com/photo-1559628233-100c798642d5?w=400&q=80', type: 'nature', suggestTime: '15:30' },
    ],
    'hà tĩnh': [
        { id: 'ht1', name: 'Khu di tích Ngã ba Đồng Lộc', description: 'Di tích lịch sử tưởng niệm 10 cô gái thanh niên xung phong.', image: 'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=400&q=80', type: 'culture', suggestTime: '08:00' },
        { id: 'ht2', name: 'Bãi biển Thiên Cầm', description: 'Bãi biển đẹp với bờ cát trắng và nước biển trong xanh.', image: 'https://images.unsplash.com/photo-1559628233-100c798642d5?w=400&q=80', type: 'nature', suggestTime: '09:00' },
        { id: 'ht3', name: 'Chùa Hương Tích', description: 'Ngôi chùa cổ trên núi Hồng Lĩnh linh thiêng.', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80', type: 'sight', suggestTime: '07:00' },
        { id: 'ht4', name: 'Đặc sản Cu Đơ', description: 'Kẹo lạc Cu Đơ – đặc sản nổi tiếng của Hà Tĩnh.', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', type: 'food', suggestTime: '10:00' },
        { id: 'ht5', name: 'Hồ Kẻ Gỗ', description: 'Hồ nước lớn với cảnh quan thiên nhiên hùng vĩ.', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', type: 'nature', suggestTime: '14:00' },
        { id: 'ht6', name: 'Bún bò Hà Tĩnh', description: 'Thưởng thức bún bò đặc sắc phong cách miền Trung.', image: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=400&q=80', type: 'food', suggestTime: '12:00' },
    ],
};

function getPlacesForDestination(dest: string): Place[] {
    if (!dest) return DEFAULT_PLACES;
    const key = dest.toLowerCase().trim();
    for (const [k, places] of Object.entries(PLACE_DB)) {
        if (key.includes(k) || k.includes(key)) return places;
    }
    return DEFAULT_PLACES;
}

const DEFAULT_PLACES: Place[] = [
    { id: 'g1', name: 'Trung tâm thành phố', description: 'Khám phá khu trung tâm nhộn nhịp.', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80', type: 'sight', suggestTime: '09:00' },
    { id: 'g2', name: 'Chợ địa phương', description: 'Thưởng thức ẩm thực đặc sản địa phương.', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', type: 'food', suggestTime: '10:00' },
    { id: 'g3', name: 'Công viên & Hồ nước', description: 'Đi dạo thư giãn tại không gian xanh.', image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80', type: 'nature', suggestTime: '07:30' },
    { id: 'g4', name: 'Bảo tàng địa phương', description: 'Tìm hiểu lịch sử văn hóa vùng đất.', image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80', type: 'culture', suggestTime: '14:00' },
    { id: 'g5', name: 'Quán ăn đặc sản', description: 'Ăn tối với menu đặc sản nổi tiếng nhất vùng.', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&q=80', type: 'food', suggestTime: '18:00' },
    { id: 'g6', name: 'Điểm ngắm cảnh', description: 'Ngắm toàn cảnh thành phố từ trên cao.', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80', type: 'sight', suggestTime: '16:00' },
];

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function placeIcon(type: PlaceType): string {
    switch (type) {
        case 'food': return 'restaurant-outline';
        case 'nature': return 'leaf-outline';
        case 'culture': return 'library-outline';
        case 'shopping': return 'bag-outline';
        default: return 'camera-outline';
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ItineraryScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();

    const { tripName, destination, startDate, endDate, budget } = useLocalSearchParams<{
        tripName: string;
        destination: string;
        startDate: string;
        endDate: string;
        budget: string;
    }>();

    const [activeDay, setActiveDay] = useState(0);
    const [saving, setSaving] = useState(false);
    // selectedByDay: Record<dayIndex, Set<placeId>>
    const [selectedByDay, setSelectedByDay] = useState<Record<number, Set<string>>>({});

    const dayCount = useMemo(() => {
        if (!startDate || !endDate) return 3;
        return getDayCount(startDate, endDate);
    }, [startDate, endDate]);

    const lastDay = dayCount - 1;

    const places = useMemo(() => getPlacesForDestination(destination ?? ''), [destination]);

    function togglePlace(placeId: string) {
        setSelectedByDay((prev) => {
            const current = new Set(prev[activeDay] ?? []);
            if (current.has(placeId)) current.delete(placeId);
            else current.add(placeId);
            return { ...prev, [activeDay]: current };
        });
    }

    function isSelected(placeId: string): boolean {
        return (selectedByDay[activeDay] ?? new Set()).has(placeId);
    }

    async function handleCreateItinerary() {
        const userId = getSessionUserId();
        if (!userId) {
            router.replace('/login');
            return;
        }
        if (!destination || !startDate || !endDate) {
            Alert.alert('Lỗi', 'Thiếu thông tin chuyến đi. Vui lòng thử lại từ đầu.');
            return;
        }

        setSaving(true);
        try {
            const tripId = await createTrip({
                tripName: tripName || `Khám phá ${destination}`,
                destination,
                startDate,
                endDate,
                status: 'PLANNED',
            }, userId);

            // Chuyển đến màn mời bạn bè
            router.replace({
                pathname: '/trip-members',
                params: { tripId: String(tripId), destination },
            });
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message ?? 'Không thể tạo chuyến đi. Hãy kiểm tra kết nối backend.');
        } finally {
            setSaving(false);
        }
    }

    // Show empty state if missing params (accessed directly from tab bar)
    if (!destination || !startDate || !endDate) {
        return (
            <View style={[styles.root, styles.centered, { backgroundColor: palette.background }]}>
                <Ionicons name="map-outline" size={52} color={palette.textMuted} />
                <Text style={[Typography.titleLG, { color: palette.text, marginTop: Spacing.md }]}>
                    Chưa có chuyến đi
                </Text>
                <Text style={[Typography.body, { color: palette.textMuted, textAlign: 'center', marginTop: Spacing.sm }]}>
                    Hãy tạo chuyến đi mới để bắt đầu lên lịch trình nhé!
                </Text>
                <Button
                    title="Tạo chuyến đi →"
                    size="lg"
                    style={{ marginTop: Spacing.xl, borderRadius: Radius.pill }}
                    onPress={() => router.push('/(tabs)/create-trip')}
                />
            </View>
        );
    }

    const selectedCount = Object.values(selectedByDay).reduce((sum, s) => sum + s.size, 0);

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[Typography.titleLG, { color: palette.text, fontSize: 22 }]} numberOfLines={1}>
                        Khám phá {destination}
                    </Text>
                    <Text style={[Typography.caption, { color: palette.textMuted }]}>
                        {formatDateVN(startDate)} – {formatDateVN(endDate)} · {dayCount} ngày
                    </Text>
                </View>
                {selectedCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: palette.primary }]}>
                        <Text style={[Typography.caption, { color: '#0B1B18', fontWeight: '700' }]}>
                            {selectedCount} địa điểm
                        </Text>
                    </View>
                )}
            </View>

            {/* Day tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabRow}
            >
                {Array.from({ length: dayCount }, (_, i) => i).map((idx) => {
                    const isActive = idx === activeDay;
                    const daySelected = selectedByDay[idx]?.size ?? 0;
                    return (
                        <Pressable
                            key={idx}
                            onPress={() => setActiveDay(idx)}
                            style={[
                                styles.dayTab,
                                {
                                    backgroundColor: isActive ? palette.primary : palette.surface,
                                    borderColor: isActive ? palette.primary : palette.border,
                                },
                            ]}
                        >
                            <Text style={[Typography.bodySemi, { color: isActive ? '#0B1B18' : palette.textMuted, fontSize: 13 }]}>
                                Ngày {idx + 1}
                            </Text>
                            <Text style={[Typography.caption, { color: isActive ? '#0B1B18' : palette.textMuted }]}>
                                {startDate ? getWeekday(startDate, idx) : ''}
                            </Text>
                            {daySelected > 0 && (
                                <View style={[styles.dayBadge, { backgroundColor: isActive ? '#0B1B18' : palette.primary }]}>
                                    <Text style={{ color: isActive ? palette.primary : '#0B1B18', fontSize: 9, fontWeight: '700' }}>
                                        {daySelected}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Day label */}
            <View style={styles.dayLabelRow}>
                <Text style={[Typography.bodySemi, { color: palette.text }]}>
                    Chọn địa điểm cho Ngày {activeDay + 1}
                </Text>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                    {selectedByDay[activeDay]?.size ?? 0} đã chọn
                </Text>
            </View>

            {/* Places list */}
            <ScrollView
                contentContainerStyle={styles.placesList}
                showsVerticalScrollIndicator={false}
            >
                {places.map((place) => {
                    const selected = isSelected(place.id);
                    return (
                        <Pressable key={place.id} onPress={() => togglePlace(place.id)}>
                            <Card
                                padded={false}
                                style={[
                                    styles.placeCard,
                                    selected && { borderWidth: 2, borderColor: palette.primary },
                                ]}
                            >
                                <View style={styles.placeInner}>
                                    <Image
                                        source={{ uri: place.image }}
                                        style={styles.placeThumb}
                                        contentFit="cover"
                                    />
                                    <View style={styles.placeInfo}>
                                        <View style={styles.placeTopRow}>
                                            <View style={[styles.placeTypeBadge, { backgroundColor: palette.surface }]}>
                                                <Ionicons name={placeIcon(place.type) as any} size={11} color={palette.primary} />
                                            </View>
                                            <Text style={[Typography.caption, { color: palette.textMuted }]}>
                                                🕐 {place.suggestTime}
                                            </Text>
                                        </View>
                                        <Text style={[Typography.bodySemi, { color: palette.text }]} numberOfLines={1}>
                                            {place.name}
                                        </Text>
                                        <Text style={[Typography.caption, { color: palette.textMuted }]} numberOfLines={2}>
                                            {place.description}
                                        </Text>
                                    </View>
                                    {/* Checkbox */}
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: selected ? palette.primary : palette.border },
                                        selected && { backgroundColor: palette.primary },
                                    ]}>
                                        {selected && <Ionicons name="checkmark" size={14} color="#0B1B18" />}
                                    </View>
                                </View>
                            </Card>
                        </Pressable>
                    );
                })}
                {/* Spacer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* "Tạo lịch" button – chỉ hiện ở ngày cuối cùng */}
            {activeDay === lastDay && (
                <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                    <Button
                        title={saving ? 'Đang tạo...' : 'Tạo lịch ✓'}
                        size="lg"
                        style={styles.footerBtn}
                        loading={saving}
                        onPress={handleCreateItinerary}
                    />
                </View>
            )}

            {/* Hint for other days */}
            {activeDay !== lastDay && (
                <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                    <Pressable onPress={() => setActiveDay(activeDay + 1)} style={[styles.nextDayBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <Text style={[Typography.bodySemi, { color: palette.text }]}>
                            Tiếp theo: Ngày {activeDay + 2} →
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center', flex: 1, padding: Spacing.xl },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl + Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        gap: Spacing.md,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.pill,
    },
    dayTabRow: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayTab: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        minWidth: 66,
        position: 'relative',
    },
    dayBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    placesList: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    placeCard: {
        overflow: 'hidden',
    },
    placeInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        gap: Spacing.md,
    },
    placeThumb: {
        width: 72,
        height: 72,
        borderRadius: Radius.md,
    },
    placeInfo: {
        flex: 1,
        gap: 4,
    },
    placeTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    placeTypeBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
    },
    footerBtn: {
        width: '100%',
        borderRadius: Radius.pill,
    },
    nextDayBtn: {
        paddingVertical: Spacing.md,
        borderRadius: Radius.pill,
        borderWidth: 1,
        alignItems: 'center',
    },
});
