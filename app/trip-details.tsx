import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { checkInLocationApi, getTripJournal } from '@/utils/api';

const TRIP_IMAGES = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=80'
];

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

export default function TripDetailsScreen() {
    const router = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeDayIdx, setActiveDayIdx] = useState(0);

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
        const days = data.days || [];
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
    }, [data, userLocation]);

    if (loading || !data) {
        return (
            <View style={[styles.root, styles.centered, { backgroundColor: '#FFFCF2' }]}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const days = data.days || [];
    const currentDay = days[activeDayIdx];
    const stopsCount = currentDay?.stops?.length || 0;
    const overallStops = days.reduce((sum: number, d: any) => sum + (d.stops?.length || 0), 0);

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ title: 'Chi tiết hành trình' }} />

            {/* Header Half */}
            <View style={styles.headerArea}>
                <Image
                    source={{ uri: TRIP_IMAGES[Number(tripId || 0) % 5] }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                />
                <View style={styles.overlay} />

                {/* Days Bubbles (Map placeholder equivalent) */}
                <View style={styles.daysAbsoluteContainer}>
                    {days.map((d: any, idx: number) => {
                        const isActive = idx === activeDayIdx;
                        // Hardcoded scattered positions roughly mapping to VN geography
                        const mapCoordinates = [
                            { top: '10%', left: '30%' }, // North
                            { top: '30%', left: '45%' }, // Central North
                            { top: '50%', left: '60%' }, // Central
                            { top: '70%', left: '40%' }, // South
                            { top: '85%', left: '20%' }, // Deep South
                        ];
                        const pos = mapCoordinates[idx % mapCoordinates.length];

                        return (
                            <Pressable
                                key={d.itineraryId}
                                style={[
                                    styles.mapBubble,
                                    { top: pos.top as any, left: pos.left as any },
                                    isActive && styles.mapBubbleActive
                                ]}
                                onPress={() => setActiveDayIdx(idx)}
                            >
                                <Text style={[styles.mapBubbleText, isActive && styles.mapBubbleTextActive]}>{d.dayNumber}</Text>
                            </Pressable>
                        );
                    })}
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
                    keyExtractor={(item: any) => item.itineraryDetailId.toString()}
                    contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 100 }}
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
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)', // make map more visible
    },
    daysAbsoluteContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 40,
    },
    mapBubble: {
        position: 'absolute',
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
    thumbnail: {
        width: 70,
        height: 70,
        borderRadius: Radius.sm,
    },
});
