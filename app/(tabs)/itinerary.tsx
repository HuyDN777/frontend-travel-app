import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { upsertTripBudget } from '@/services/api/finance';
import { createTrip, deleteTrip, getMyTrips, getTouristAttractions, type TripItem } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';
import TripDetailsScreen from '../trip-details';

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

export interface Place {
    id: string;
    name: string;
    description: string;
    image: string;
    type: PlaceType;
    suggestTime: string;
    latitude?: number;
    longitude?: number;
}

export const DEFAULT_PLACES: Place[] = [
    { id: 'g1', name: 'Trung tâm thành phố', description: 'Khám phá khu trung tâm nhộn nhịp.', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80', type: 'sight', suggestTime: '09:00', latitude: 21.0285, longitude: 105.8542 },
    { id: 'g2', name: 'Chợ địa phương', description: 'Thưởng thức ẩm thực đặc sản địa phương.', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', type: 'food', suggestTime: '10:00', latitude: 21.0280, longitude: 105.8540 },
    { id: 'g3', name: 'Công viên & Hồ nước', description: 'Đi dạo thư giãn tại không gian xanh.', image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80', type: 'nature', suggestTime: '07:30', latitude: 21.0275, longitude: 105.8500 },
    { id: 'g4', name: 'Bảo tàng địa phương', description: 'Tìm hiểu lịch sử văn hóa vùng đất.', image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80', type: 'culture', suggestTime: '14:00', latitude: 21.0260, longitude: 105.8600 },
    { id: 'g5', name: 'Quán ăn đặc sản', description: 'Ăn tối với menu đặc sản nổi tiếng nhất vùng.', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&q=80', type: 'food', suggestTime: '18:00', latitude: 21.0250, longitude: 105.8550 },
    { id: 'g6', name: 'Điểm ngắm cảnh', description: 'Ngắm toàn cảnh thành phố từ trên cao.', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80', type: 'sight', suggestTime: '16:00', latitude: 21.0300, longitude: 105.8500 },
];

// ─── Icon helpers ─────────────────────────────────────────────────────────────

export function placeIcon(type: PlaceType): string {
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
    const insets = useSafeAreaInsets();
    const currentUserId = getSessionUserId();

    const { tripId, tripName, destination, startDate, endDate, budget } = useLocalSearchParams<{
        tripId: string;
        tripName: string;
        destination: string;
        startDate: string;
        endDate: string;
        budget?: string;
    }>();

    // If tripId is provided, we are VIEWING an existing trip Journal
    if (tripId) {
        return <TripDetailsScreen />;
    }
    const hasCreateParams = !!(destination && startDate && endDate);

    const [activeDay, setActiveDay] = useState(0);
    const [saving, setSaving] = useState(false);
    // selectedByDay: Record<dayIndex, Set<placeId>>
    const [selectedByDay, setSelectedByDay] = useState<Record<number, Set<string>>>({});
    const [hiddenPlaceIds, setHiddenPlaceIds] = useState<Set<string>>(new Set());

    const dayCount = useMemo(() => {
        if (!startDate || !endDate) return 3;
        return getDayCount(startDate, endDate);
    }, [startDate, endDate]);

    const lastDay = dayCount - 1;

    const [places, setPlaces] = useState<Place[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(true);
    const [existingTrips, setExistingTrips] = useState<TripItem[]>([]);
    const [loadingTrips, setLoadingTrips] = useState(false);
    
    async function loadExistingTrips() {
        const userId = getSessionUserId();
        if (!userId) {
            setExistingTrips([]);
            return;
        }
        setLoadingTrips(true);
        try {
            const trips = await getMyTrips(userId);
            const sorted = [...trips].sort((a, b) => {
                const ad = a.startDate ? parseDate(a.startDate).getTime() : 0;
                const bd = b.startDate ? parseDate(b.startDate).getTime() : 0;
                return bd - ad;
            });
            setExistingTrips(sorted);
        } catch {
            setExistingTrips([]);
        } finally {
            setLoadingTrips(false);
        }
    }

    useEffect(() => {
        if (!destination) {
            setPlaces(DEFAULT_PLACES);
            setLoadingPlaces(false);
            return;
        }

        let isMounted = true;
        async function fetchPlaces() {
            try {
                setLoadingPlaces(true);
                const results = await getTouristAttractions(destination as string, 20);
                if (!isMounted) return;

                if (results && results.length > 0) {
                    const mapped: Place[] = results.map((r, index) => {
                        const defaultTimes = ["08:00", "09:30", "11:00", "14:00", "15:30", "18:00"];
                        return {
                            id: r.osmId || `p_${index}`,
                            name: r.name || 'Unnamed Place',
                            description: r.description || r.addressLine || 'Địa điểm tham quan nổi bật',
                            image: r.previewImageUrl || 'https://images.unsplash.com/photo-1548574505-5e239809f9e0?w=400&q=80',
                            type: 'sight',
                            suggestTime: defaultTimes[index % defaultTimes.length],
                            latitude: r.lat,
                            longitude: r.lon
                        };
                    });
                    setPlaces(mapped);
                } else {
                    setPlaces(DEFAULT_PLACES);
                }
            } catch (error) {
                console.error("Failed to fetch attractions:", error);
                if (isMounted) setPlaces(DEFAULT_PLACES);
            } finally {
                if (isMounted) setLoadingPlaces(false);
            }
        }
        fetchPlaces();

        return () => { isMounted = false; };
    }, [destination]);

    useEffect(() => {
        if (hasCreateParams) return;
        let mounted = true;
        void (async () => {
            await loadExistingTrips();
            if (!mounted) return;
        })();
        return () => {
            mounted = false;
        };
    }, [hasCreateParams]);

    useFocusEffect(
        React.useCallback(() => {
            if (!hasCreateParams) {
                void loadExistingTrips();
            }
            return undefined;
        }, [hasCreateParams])
    );

    function confirmDeleteTrip(trip: TripItem) {
        if (trip.userId != null && currentUserId != null && trip.userId !== currentUserId) {
            Alert.alert('Không thể xóa', 'Bạn không phải chủ chuyến đi này.');
            return;
        }
        Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa chuyến đi "${trip.tripName}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteTrip(trip.id);
                        await loadExistingTrips();
                    } catch (error) {
                        Alert.alert('Không thể xóa', error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
                    }
                },
            },
        ]);
    }

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

    function hideRecommendation(placeId: string) {
        setHiddenPlaceIds((prev) => {
            const next = new Set(prev);
            next.add(placeId);
            return next;
        });
        setSelectedByDay((prev) => {
            const copy: Record<number, Set<string>> = {};
            Object.entries(prev).forEach(([k, set]) => {
                const nextSet = new Set(set);
                nextSet.delete(placeId);
                copy[Number(k)] = nextSet;
            });
            return copy;
        });
    }

    function restoreAllRecommendations() {
        setHiddenPlaceIds(new Set());
    }

    function shuffleRecommendations() {
        setPlaces((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [next[i], next[j]] = [next[j], next[i]];
            }
            return next;
        });
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
            const activeDays = Object.entries(selectedByDay).map(([dayIdx, placeIdsSet]) => {
                const stops = places
                    .filter((p) => placeIdsSet.has(p.id))
                    .map((p) => ({
                        name: p.name,
                        description: p.description,
                        category: p.type,
                        latitude: p.latitude || 21.0285,
                        longitude: p.longitude || 105.8542,
                        suggestTime: p.suggestTime,
                        imageUrl: p.image,
                    }));

                return {
                    dayIndex: Number(dayIdx),
                    places: stops,
                };
            }).filter(day => day.places.length > 0);

            const tripId = await createTrip({
                tripName: tripName || `Khám phá ${destination}`,
                destination,
                startDate,
                endDate,
                status: 'PLANNED',
                activeDays,
            }, userId);

            const initialBudget = Number(String(budget ?? '').replace(/\D/g, ''));
            if (!Number.isNaN(initialBudget) && initialBudget > 0) {
                await upsertTripBudget(tripId, {
                    category: 'Tổng',
                    limitAmount: initialBudget,
                });
            }

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

    // Accessed directly from tab bar: show existing trips instead of always empty
    if (!hasCreateParams) {
        return (
            <View style={[styles.root, styles.centered, { backgroundColor: palette.background, paddingTop: insets.top + Spacing.sm }]}>
                {loadingTrips ? (
                    <ActivityIndicator size="large" color={palette.primary} />
                ) : existingTrips.length > 0 ? (
                    <View style={styles.existingWrap}>
                        <Text style={[Typography.titleLG, { color: palette.text }]}>Lịch trình của bạn</Text>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.existingList}>
                            {existingTrips.map((trip) => (
                                <Card key={trip.id} style={[styles.existingCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                                    <View style={styles.existingHeader}>
                                        <Text style={[Typography.bodySemi, { color: palette.text, flex: 1 }]} numberOfLines={1}>
                                            {trip.tripName || 'Chuyến đi của tôi'}
                                        </Text>
                                        {(trip.userId == null || currentUserId == null || trip.userId === currentUserId) ? (
                                            <Pressable onPress={() => confirmDeleteTrip(trip)} hitSlop={8}>
                                                <Ionicons name="trash-outline" size={18} color="#D64545" />
                                            </Pressable>
                                        ) : null}
                                    </View>
                                    <Text style={[Typography.caption, { color: palette.textMuted }]} numberOfLines={1}>
                                        {trip.destination || 'Chưa có điểm đến'}
                                    </Text>
                                    <Text style={[Typography.caption, { color: palette.textMuted, marginTop: 4 }]}>
                                        {trip.startDate && trip.endDate
                                            ? `${formatDateVN(trip.startDate)} - ${formatDateVN(trip.endDate)}`
                                            : 'Chưa có ngày'}
                                    </Text>
                                    <Pressable
                                        onPress={() =>
                                            router.push({
                                                pathname: '/(tabs)/itinerary',
                                                params: { tripId: String(trip.id) },
                                            })
                                        }
                                        style={styles.detailBtn}>
                                        <Text style={styles.detailBtnText}>Chi tiết hành trình</Text>
                                        <Ionicons name="chevron-forward" size={14} color="#1F78FF" />
                                    </Pressable>
                                </Card>
                            ))}
                        </ScrollView>
                        <Button
                            title="Tạo chuyến đi mới"
                            size="lg"
                            style={{ borderRadius: Radius.pill }}
                            onPress={() => router.push('/name-trip')}
                        />
                    </View>
                ) : (
                    <>
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
                            onPress={() => router.push('/name-trip')}
                        />
                    </>
                )}
            </View>
        );
    }

    const selectedCount = Object.values(selectedByDay).reduce((sum, s) => sum + s.size, 0);
    const visiblePlaces = places.filter((p) => !hiddenPlaceIds.has(p.id));

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: palette.border, paddingTop: insets.top + Spacing.md }]}>
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
            <View style={styles.recommendActions}>
                <Pressable onPress={shuffleRecommendations} style={[styles.recommendBtn, { borderColor: palette.border }]}>
                    <Text style={[Typography.caption, { color: palette.text }]}>Đổi gợi ý</Text>
                </Pressable>
                <Pressable
                    onPress={restoreAllRecommendations}
                    style={[styles.recommendBtn, { borderColor: palette.border, opacity: hiddenPlaceIds.size > 0 ? 1 : 0.5 }]}
                    disabled={hiddenPlaceIds.size === 0}
                >
                    <Text style={[Typography.caption, { color: palette.text }]}>Khôi phục gợi ý</Text>
                </Pressable>
            </View>

            {/* Places list */}
            <ScrollView
                contentContainerStyle={styles.placesList}
                showsVerticalScrollIndicator={false}
            >
                {loadingPlaces ? (
                    <View style={{ paddingTop: Spacing.xl * 3, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={palette.primary} />
                    </View>
                ) : (
                    <>
                        {visiblePlaces.map((place) => {
                            const selected = isSelected(place.id);
                            return (
                                <Pressable key={place.id} onPress={() => togglePlace(place.id)}>
                                    <Card
                                        padded={false}
                                        style={[
                                            styles.placeCard,
                                            selected ? { borderWidth: 2, borderColor: palette.primary } : { borderWidth: 0 },
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
                                                <Pressable
                                                    onPress={() => hideRecommendation(place.id)}
                                                    hitSlop={8}
                                                    style={styles.hideBtn}
                                                >
                                                    <Text style={styles.hideBtnText}>Không phù hợp</Text>
                                                </Pressable>
                                            </View>
                                            {/* Checkbox */}
                                            <View style={[
                                                styles.checkbox,
                                                { borderColor: selected ? palette.primary : palette.border },
                                                selected ? { backgroundColor: palette.primary } : { backgroundColor: 'transparent' },
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
                    </>
                )}
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
    existingWrap: {
        width: '100%',
        flex: 1,
        gap: Spacing.md,
    },
    existingList: {
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    existingCard: {
        borderWidth: 1,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    existingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    detailBtn: {
        marginTop: Spacing.sm,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F78FF',
    },
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
    recommendActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    recommendBtn: {
        borderWidth: 1,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
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
    hideBtn: {
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    hideBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D64545',
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
