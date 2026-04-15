import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { checkInLocationApi, getTripJournal, resolveMediaUrl } from '@/utils/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

function parseDate(s: string): Date {
    return new Date(s + 'T00:00:00');
}

function formatDateVN(s: string): string {
    const d = parseDate(s);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getTripDayCount(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 0;
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return diff > 0 ? diff : 0;
}

function buildDisplayDays(data: any): Array<{ itineraryId?: number; dayNumber: number; stops: any[] }> {
    const apiDays = Array.isArray(data?.days) ? data.days : [];
    const totalDays = getTripDayCount(data?.trip?.startDate, data?.trip?.endDate);

    // Fallback: nếu thiếu khoảng ngày, vẫn hiển thị theo dữ liệu API đang có.
    if (totalDays <= 0) {
        return apiDays.map((d: any, idx: number) => ({
            itineraryId: d?.itineraryId,
            dayNumber: idx + 1,
            stops: Array.isArray(d?.stops) ? d.stops : [],
        }));
    }

    const arranged: Array<any | undefined> = new Array(totalDays).fill(undefined);
    const usedIndexes = new Set<number>();
    const mappedSourceIndexes = new Set<number>();
    const tripStart = parseDate(data.trip.startDate);

    function tryPlace(index: number, dayData: any, sourceIndex: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index >= totalDays || usedIndexes.has(index)) return false;
        arranged[index] = dayData;
        usedIndexes.add(index);
        mappedSourceIndexes.add(sourceIndex);
        return true;
    }

    for (let sourceIdx = 0; sourceIdx < apiDays.length; sourceIdx += 1) {
        const d = apiDays[sourceIdx];
        const dayIndexRaw = Number(d?.dayIndex);
        if (tryPlace(dayIndexRaw, d, sourceIdx)) continue;

        const dayNumberRaw = Number(d?.dayNumber);
        if (tryPlace(dayNumberRaw - 1, d, sourceIdx)) continue;

        const dayDateRaw = d?.date ?? d?.travelDate ?? d?.dayDate;
        if (typeof dayDateRaw === 'string') {
            const dayDate = parseDate(dayDateRaw);
            if (!Number.isNaN(dayDate.getTime()) && !Number.isNaN(tripStart.getTime())) {
                const offset = Math.round((dayDate.getTime() - tripStart.getTime()) / 86_400_000);
                if (tryPlace(offset, d, sourceIdx)) continue;
            }
        }
    }

    let fallbackCursor = 0;
    for (let sourceIdx = 0; sourceIdx < apiDays.length; sourceIdx += 1) {
        if (mappedSourceIndexes.has(sourceIdx)) continue;
        while (fallbackCursor < totalDays && usedIndexes.has(fallbackCursor)) {
            fallbackCursor += 1;
        }
        if (fallbackCursor >= totalDays) break;
        arranged[fallbackCursor] = apiDays[sourceIdx];
        usedIndexes.add(fallbackCursor);
        fallbackCursor += 1;
    }

    return arranged.map((d, idx) => ({
        itineraryId: d?.itineraryId,
        dayNumber: idx + 1,
        stops: Array.isArray(d?.stops) ? d.stops : [],
    }));
}

function toValidImage(url: unknown): string {
    if (typeof url !== 'string') return '';
    const normalized = resolveMediaUrl(url).trim();
    if (!normalized || normalized === 'null' || normalized === 'undefined') return '';
    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('data:')) return '';
    return normalized;
}

function getFirstSelectedTripImage(source: any): string {
    const daysRaw = source?.activeDays ?? source?.days ?? [];
    const days = Array.isArray(daysRaw) ? [...daysRaw] : [];

    days.sort((a: any, b: any) => {
        const aIdx = Number(a?.dayIndex ?? a?.dayNumber ?? 0);
        const bIdx = Number(b?.dayIndex ?? b?.dayNumber ?? 0);
        return aIdx - bIdx;
    });

    for (const day of days) {
        const places = day?.places ?? day?.stops ?? [];
        if (!Array.isArray(places)) continue;
        for (const place of places) {
            const candidates: unknown[] = [
                place?.imageUrl,
                place?.post?.imageUrl,
                place?.previewImageUrl,
                place?.thumbnail
            ];
            for (const c of candidates) {
                const valid = toValidImage(c);
                if (valid) return valid;
            }
        }
    }

    const fallbackCandidates: unknown[] = [
        source?.imageUrl,
        source?.coverImageUrl,
        source?.thumbnail,
        source?.trip?.imageUrl,
        source?.trip?.coverImageUrl
    ];
    for (const c of fallbackCandidates) {
        const valid = toValidImage(c);
        if (valid) return valid;
    }

    return '';
}

export default function TripDetailsScreen() {
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const displayDays = useMemo(() => buildDisplayDays(data), [data]);
    const headerCoverImage = useMemo(() => getFirstSelectedTripImage(data), [data]);
    const dayOffsets = useMemo(() => {
        const count = displayDays.length;
        if (count === 0) return [];

        // Random ổn định theo tripId để UI không "nhảy" lại sau mỗi lần render.
        let seed = Number(tripId || 1);
        if (!Number.isFinite(seed) || seed <= 0) seed = 1;
        const nextRand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        return Array.from({ length: count }, (_, idx) => {
            const base = idx % 2 === 0 ? 4 : 54;
            const jitter = Math.floor(nextRand() * 20);
            return base + jitter;
        });
    }, [displayDays.length, tripId]);

    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    // 1. Ask for Location Permission & Fetch Location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permission to access location was denied');
                return;
            }
            // Get current location (once, to avoid battery drain, or use watchPositionAsync)
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);
        })();
    }, []);

    // 2. Fetch Trip Journal
    async function fetchJournal() {
        try {
            if (!tripId) return;
            const res = await getTripJournal(Number(tripId));
            setData(res);
        } catch (e) {
            console.log('Error fetching journal', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchJournal();
    }, [tripId]);

    // 3. Process the Checks in a stable Effect
    useEffect(() => {
        if (!data || !userLocation) return;
        const days = displayDays;
        let hasCheckIn = false;

        const checkLocations = async () => {
            for (const d of days) {
                for (const stop of d.stops || []) {
                    if (stop.status === '1' || !stop.post) continue;

                    const distance = calculateDistance(
                        userLocation.coords.latitude,
                        userLocation.coords.longitude,
                        stop.post.latitude,
                        stop.post.longitude
                    );

                    if (distance <= 200) {
                        try {
                            await checkInLocationApi(stop.postItineraryDetailId);
                            hasCheckIn = true;
                        } catch (e) {
                            console.log('Check-in error', e);
                        }
                    }
                }
            }
            if (hasCheckIn) {
                fetchJournal(); // reload to reflect UI ticks
            }
        };

        checkLocations();
    }, [displayDays, userLocation, data]);

    useEffect(() => {
        if (displayDays.length === 0) return;
        setActiveDayIdx((prev) => Math.min(prev, displayDays.length - 1));
    }, [displayDays.length]);

    if (loading || !data) {
        return (
            <View style={[styles.root, styles.centered, { backgroundColor: '#FFFCF2' }]}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const days = displayDays;
    const currentDay = days[activeDayIdx];
    const overallStops = days.reduce((sum: number, d: any) => sum + (d.stops?.length || 0), 0);

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ title: 'Chi tiết hành trình' }} />

            {/* Header Half */}
            <View style={styles.headerArea}>
                {headerCoverImage ? (
                    <Image
                        source={{ uri: headerCoverImage }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, styles.headerFallbackBg]} />
                )}
                <View style={styles.overlay} />

                {/* Day selector: luôn hiển thị đủ ngày, có thể cuộn ngang */}
                <View style={styles.daysAbsoluteContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dayChipRow}
                    >
                        {days.map((d: any, idx: number) => {
                            const isActive = idx === activeDayIdx;
                            const marginTop = dayOffsets[idx] ?? 0;
                            return (
                                <Pressable
                                    key={d.itineraryId ?? `day-${idx}`}
                                    style={[
                                        styles.mapBubble,
                                        { marginTop },
                                        isActive && styles.mapBubbleActive
                                    ]}
                                    onPress={() => setActiveDayIdx(idx)}
                                >
                                    <Text style={[styles.mapBubbleText, isActive && styles.mapBubbleTextActive]}>{idx + 1}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            {/* Bottom Sheet Area */}
            <View style={styles.sheetLayout}>
                <View style={styles.handleBar} />

                <View style={{ padding: Spacing.xl }}>
                    <Text style={styles.journalTitle}>Nhật ký hành trình</Text>
                    <Text style={styles.journalSubtitle}>
                        {overallStops} điểm đến · {data.trip?.startDate ? formatDateVN(data.trip.startDate) : ''}
                    </Text>
                </View>

                <FlatList
                    data={currentDay?.stops || []}
                    keyExtractor={(item: any, index) => String(item.itineraryDetailId ?? `${activeDayIdx}-${index}`)}
                    contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 100 }}
                    ListEmptyComponent={(
                        <View style={styles.emptyDayWrapper}>
                            <Text style={styles.emptyDayText}>Ngày này chưa có địa điểm nào trong lịch trình.</Text>
                        </View>
                    )}
                    renderItem={({ item, index }) => {
                        const isArrived = item.status === '1';

                        return (
                            <View style={styles.timelineRow}>
                                {/* Timeline Line */}
                                <View style={styles.timelineCol}>
                                    <View style={[styles.dot, isArrived && styles.dotArrived]} />
                                    {index !== currentDay.stops.length - 1 && <View style={styles.line} />}
                                </View>

                                {/* Content */}
                                <View style={styles.contentCol}>
                                    <View style={styles.contentHeader}>
                                        <Text style={styles.stopName}>{item.post?.title || 'Chưa rõ'}</Text>
                                        <Text style={styles.visitTime}>
                                            {item.visitTime ? item.visitTime.substring(0, 5) : 'Tuỳ chọn'}
                                        </Text>
                                    </View>

                                    {isArrived && (
                                        <Text style={styles.statusText}>✓ Đã đến ({item.post.latitude}, {item.post.longitude})</Text>
                                    )}

                                    <View style={styles.noteWrapper}>
                                        <Text style={styles.noteText}>"{item.note || 'Không có ghi chú'}"</Text>
                                        {item.post?.imageUrl ? (
                                            <Image source={{ uri: item.post.imageUrl }} style={styles.thumbnail} />
                                        ) : (
                                            <Image source={{ uri: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&q=80' }} style={styles.thumbnail} />
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerArea: {
        height: '40%',
        width: '100%',
        position: 'relative',
    },
    headerFallbackBg: {
        backgroundColor: '#3C4752',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)', // make map more visible
    },
    daysAbsoluteContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 52,
        paddingHorizontal: Spacing.lg,
    },
    dayChipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        minHeight: 110,
        paddingBottom: Spacing.xs,
    },
    mapBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF0D1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    mapBubbleActive: {
        backgroundColor: '#FF5722',
        transform: [{ scale: 1.2 }],
        borderColor: '#FF5722',
    },
    mapBubbleText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '800',
    },
    mapBubbleTextActive: {
        color: '#FFF',
    },
    sheetLayout: {
        flex: 1,
        backgroundColor: '#FFFCF2', // Journal cream color natively
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -20,
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#DDD',
        alignSelf: 'center',
        marginTop: 15,
    },
    journalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2D312E',
    },
    journalSubtitle: {
        fontSize: 14,
        color: '#8A918C',
        marginTop: 4,
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: Spacing.xl,
    },
    timelineCol: {
        width: 30,
        alignItems: 'center',
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#C8D2CD', // gray
        marginTop: 5,
    },
    dotArrived: {
        backgroundColor: '#8BC34A', // green check
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: '#E6EAE8',
        marginTop: 5,
        marginBottom: -20,
    },
    contentCol: {
        flex: 1,
        paddingLeft: Spacing.sm,
    },
    contentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stopName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D312E',
        flex: 1,
    },
    visitTime: {
        fontSize: 12,
        color: '#8A918C',
        fontWeight: '600',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8BC34A',
        marginVertical: 4,
    },
    noteWrapper: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    noteText: {
        fontStyle: 'italic',
        color: '#5C635E',
        fontSize: 14,
        flex: 1,
        marginRight: Spacing.md,
        lineHeight: 22,
    },
    emptyDayWrapper: {
        paddingTop: Spacing.lg,
    },
    emptyDayText: {
        fontSize: 14,
        color: '#8A918C',
        textAlign: 'center',
    },
    thumbnail: {
        width: 70,
        height: 70,
        borderRadius: Radius.sm,
    },
});
