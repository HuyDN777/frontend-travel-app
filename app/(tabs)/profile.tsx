import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const trips = [
    {
        id: 'kyoto',
        title: 'Autumn in Kyoto',
        dates: 'Oct 14 - Oct 20, 2024',
        days: 7,
        image:
            'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'tokyo',
        title: 'Tokyo Night Walk',
        dates: 'Nov 02 - Nov 05, 2024',
        days: 4,
        image:
            'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'winter',
        title: 'Winter Escape',
        dates: 'Dec 10 - Dec 17, 2024',
        days: 8,
        image:
            'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=900&q=80',
    },
];

// 4 FAB icons fixed on the right side (from Figma: location, journal/map, play, sparkle)
const FAB_ICONS = [
    { name: 'location-outline', key: 'location' },
    { name: 'journal-outline', key: 'journal' },
    { name: 'play-outline', key: 'play' },
    { name: 'sparkles-outline', key: 'sparkles' },
] as const;

export default function ProfileScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'trips' | 'saved'>('trips');

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Scrollable content */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.profileInfo}>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/100?img=12' }}
                            style={styles.avatar}
                        />
                        <View>
                            <Text style={[Typography.titleLG, { color: palette.text }]}>Akiko Tanaka</Text>
                            <Text style={[Typography.caption, { color: palette.textMuted }]}>
                                @akikotravels • Tokyo, Japan
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        style={[styles.editBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}
                    >
                        <Text style={[Typography.caption, { color: palette.text, fontWeight: '600' }]}>
                            Edit Profile
                        </Text>
                    </Pressable>
                </View>

                {/* My Trips / Saved tabs */}
                <View style={[styles.tabRow, { borderBottomColor: palette.border }]}>
                    {(['trips', 'saved'] as const).map((tab) => (
                        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                            <Text
                                style={[
                                    Typography.bodySemi,
                                    { color: activeTab === tab ? palette.primary : palette.textMuted },
                                ]}
                            >
                                {tab === 'trips' ? 'My Trips' : 'Saved'}
                            </Text>
                            {activeTab === tab && (
                                <View style={[styles.tabUnderline, { backgroundColor: palette.primary }]} />
                            )}
                        </Pressable>
                    ))}
                </View>

                {/* Plan new trip button */}
                <Pressable
                    onPress={() => router.push('/(tabs)/create-trip' as any)}
                    style={[styles.newTripBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                    <Ionicons name="add" size={18} color={palette.primary} />
                    <Text style={[Typography.bodySemi, { color: palette.primary }]}>Plan a new trip</Text>
                </Pressable>

                {/* Trip cards — NO action icons here, those are fixed overlay */}
                {trips.map((trip) => (
                    <Card key={trip.id} padded={false} style={styles.tripCard}>
                        <Image source={{ uri: trip.image }} style={styles.tripImage} contentFit="cover" />
                        {/* Days badge */}
                        <View style={[styles.daysBadge, { backgroundColor: palette.primary }]}>
                            <Text style={[Typography.caption, { color: '#0B1B18', fontWeight: '700' }]}>
                                {trip.days} days
                            </Text>
                        </View>
                        {/* Trip info */}
                        <View style={styles.tripMeta}>
                            <Text style={[Typography.bodySemi, { color: palette.text }]}>{trip.title}</Text>
                            <View style={styles.tripDateRow}>
                                <Ionicons name="calendar-outline" size={12} color={palette.textMuted} />
                                <Text style={[Typography.caption, { color: palette.textMuted }]}>{trip.dates}</Text>
                            </View>
                        </View>
                    </Card>
                ))}

                {/* Bottom padding so content doesn't hide behind FAB/tab bar */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ─── FIXED FAB GROUP ─────────────────────────────────────────────────
           Positioned absolute relative to root View (outside ScrollView).
           These stay fixed regardless of scroll position. */}
            <View style={styles.fabGroup} pointerEvents="box-none">
                {FAB_ICONS.map((fab) => (
                    <Pressable
                        key={fab.key}
                        style={({ pressed }) => [
                            styles.fab,
                            { backgroundColor: '#C35F44', opacity: pressed ? 0.8 : 1 },
                        ]}
                    >
                        <Ionicons name={fab.name as any} size={18} color="#FFF" />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        gap: Spacing.lg,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 999,
    },
    editBtn: {
        borderRadius: Radius.pill,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        gap: Spacing.xl,
    },
    tabItem: {
        paddingBottom: Spacing.sm,
        position: 'relative',
    },
    tabUnderline: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 2,
        borderRadius: Radius.pill,
    },
    newTripBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: Radius.xl,
        borderWidth: 1,
        paddingVertical: Spacing.md,
        ...Elevation.card,
    },
    tripCard: {
        overflow: 'hidden',
    },
    tripImage: {
        width: '100%',
        height: 180,
    },
    daysBadge: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    tripMeta: {
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    tripDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },

    // ── Fixed FAB group ──────────────────────────────────────────────────────
    fabGroup: {
        position: 'absolute',   // relative to root View, NOT ScrollView
        right: Spacing.lg,
        bottom: 100,            // above bottom tab bar (~80px) + some margin
        gap: Spacing.sm,
    },
    fab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        ...Elevation.floating,
    },
});
