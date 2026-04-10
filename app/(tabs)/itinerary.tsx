import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── Data ────────────────────────────────────────────────────────────────────

type ActivityType = 'camera' | 'food' | 'eye' | 'moon';

interface Activity {
    id: string;
    time: string;
    name: string;
    description: string;
    image: string;
    type: ActivityType;
}

interface DayData {
    day: number;
    label: string;
    activities: Activity[];
}

const ITINERARY: DayData[] = [
    {
        day: 1,
        label: 'Mon',
        activities: [
            {
                id: 'd1a1',
                time: '09:00 AM',
                name: 'Fushimi Inari Taisha',
                description: 'Iconic shrine with thousands of vermilion torii gates.',
                image:
                    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=400&q=80',
                type: 'camera',
            },
            {
                id: 'd1a2',
                time: '12:30 PM',
                name: 'Lunch at Nishiki Market',
                description: "Exploring the 'Kitchen of Kyoto' for local street food.",
                image:
                    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=400&q=80',
                type: 'food',
            },
            {
                id: 'd1a3',
                time: '03:00 PM',
                name: 'Gion District Walk',
                description: 'Traditional wooden machiya houses and geisha district.',
                image:
                    'https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?auto=format&fit=crop&w=400&q=80',
                type: 'camera',
            },
            {
                id: 'd1a4',
                time: '07:00 PM',
                name: 'Ramen Dinner',
                description: 'Authentic tonkotsu ramen at a local favorite.',
                image:
                    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80',
                type: 'food',
            },
        ],
    },
    {
        day: 2,
        label: 'Tue',
        activities: [
            {
                id: 'd2a1',
                time: '08:00 AM',
                name: 'Arashiyama Bamboo Grove',
                description: 'Early morning walk through the towering bamboo stalks.',
                image:
                    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=400&q=80',
                type: 'camera',
            },
            {
                id: 'd2a2',
                time: '10:30 AM',
                name: 'Morning Matcha',
                description: 'Traditional tea ceremony experience.',
                image:
                    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80',
                type: 'food',
            },
            {
                id: 'd2a3',
                time: '02:00 PM',
                name: 'Kinkaku-ji',
                description: 'The famous Golden Pavilion reflecting in the pond.',
                image:
                    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
                type: 'eye',
            },
        ],
    },
    {
        day: 3,
        label: 'Wed',
        activities: [
            {
                id: 'd3a1',
                time: '10:00 AM',
                name: 'Nara Park Day Trip',
                description: 'Feeding the friendly deer and visiting Todai-ji temple.',
                image:
                    'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=400&q=80',
                type: 'camera',
            },
        ],
    },
];

// ─── Icon helper ─────────────────────────────────────────────────────────────

function activityIcon(type: ActivityType): string {
    switch (type) {
        case 'food':
            return 'restaurant-outline';
        case 'eye':
            return 'eye-outline';
        case 'moon':
            return 'moon-outline';
        default:
            return 'camera-outline';
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ItineraryScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const [activeDay, setActiveDay] = useState(0);

    const currentDay = ITINERARY[activeDay];

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <View>
                    <Text style={[Typography.titleLG, { color: palette.text, fontSize: 26 }]}>
                        Kyoto Adventure
                    </Text>
                    <Text style={[Typography.caption, { color: palette.textMuted }]}>
                        Oct 14 – Oct 20, 2024
                    </Text>
                </View>
                <Pressable style={[styles.shareBtn, { backgroundColor: palette.surface }]}>
                    <Ionicons name="share-outline" size={20} color={palette.text} />
                </Pressable>
            </View>

            {/* Day tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabRow}
            >
                {ITINERARY.map((d, idx) => {
                    const isActive = idx === activeDay;
                    return (
                        <Pressable
                            key={d.day}
                            onPress={() => setActiveDay(idx)}
                            style={[
                                styles.dayTab,
                                {
                                    backgroundColor: isActive ? palette.primary : palette.surface,
                                    borderColor: isActive ? palette.primary : palette.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    Typography.bodySemi,
                                    { color: isActive ? '#0B1B18' : palette.textMuted, fontSize: 13 },
                                ]}
                            >
                                Day {d.day}
                            </Text>
                            <Text
                                style={[
                                    Typography.caption,
                                    { color: isActive ? '#0B1B18' : palette.textMuted },
                                ]}
                            >
                                {d.label}
                            </Text>
                        </Pressable>
                    );
                })}
                {/* Add day button */}
                <Pressable
                    style={[styles.dayTab, styles.addDayBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                    <Ionicons name="add" size={20} color={palette.textMuted} />
                </Pressable>
            </ScrollView>

            {/* Timeline */}
            <ScrollView contentContainerStyle={styles.timeline} showsVerticalScrollIndicator={false}>
                {currentDay.activities.map((act, i) => (
                    <View key={act.id} style={styles.timelineRow}>
                        {/* Left column: icon + line */}
                        <View style={styles.timelineLeft}>
                            <View
                                style={[
                                    styles.activityIconWrap,
                                    { backgroundColor: palette.surface, borderColor: palette.border },
                                ]}
                            >
                                <Ionicons name={activityIcon(act.type) as any} size={14} color={palette.primary} />
                            </View>
                            {i < currentDay.activities.length - 1 && (
                                <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />
                            )}
                        </View>

                        {/* Right column: time + card */}
                        <View style={styles.timelineRight}>
                            <Text style={[Typography.caption, { color: palette.textMuted }]}>{act.time}</Text>
                            <Card padded={false} style={styles.actCard}>
                                <View style={styles.actCardInner}>
                                    <Image
                                        source={{ uri: act.image }}
                                        style={styles.actThumb}
                                        contentFit="cover"
                                    />
                                    <View style={styles.actInfo}>
                                        <Text
                                            style={[Typography.bodySemi, { color: palette.text }]}
                                            numberOfLines={1}
                                        >
                                            {act.name}
                                        </Text>
                                        <Text
                                            style={[Typography.caption, { color: palette.textMuted }]}
                                            numberOfLines={2}
                                        >
                                            {act.description}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </View>
                    </View>
                ))}

                {/* End of day */}
                <View style={styles.endOfDay}>
                    <Ionicons name="moon-outline" size={14} color={palette.textMuted} />
                    <Text style={[Typography.caption, { color: palette.textMuted }]}>
                        End of Day {currentDay.day}
                    </Text>
                </View>

                {/* Spacer for footer button */}
                <View style={{ height: 90 }} />
            </ScrollView>

            {/* Create button */}
            <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <Button title="Create" size="lg" style={styles.footerBtn} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl + Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    shareBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        ...Elevation.card,
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
        minWidth: 60,
    },
    addDayBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.lg,
        minWidth: 0,
    },
    timeline: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    timelineRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 32,
    },
    activityIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    timelineLine: {
        width: 1,
        flex: 1,
        marginTop: 4,
    },
    timelineRight: {
        flex: 1,
        gap: Spacing.xs,
        paddingBottom: Spacing.md,
    },
    actCard: {
        overflow: 'hidden',
    },
    actCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        gap: Spacing.md,
    },
    actThumb: {
        width: 64,
        height: 64,
        borderRadius: Radius.md,
    },
    actInfo: {
        flex: 1,
        gap: Spacing.xs,
    },
    endOfDay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingLeft: 40,
        marginTop: Spacing.sm,
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
});
