import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTrip } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

const recentSearches = ['Kyoto, Japan', 'Seoul, South Korea', 'Taipei, Taiwan'];

function formatDate(date: Date | null): string {

    if (!date) return '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CreateTripScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();

    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);

    // Which picker is open: 'start' | 'end' | null
    const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
    // Temp date while user is picking (so we don't update state until confirmed on iOS)
    const [tempDate, setTempDate] = useState<Date>(new Date());

    function openPicker(target: 'start' | 'end') {
        const initial =
            target === 'start' ? startDate ?? new Date() : endDate ?? startDate ?? new Date();
        setTempDate(initial);
        setPickerTarget(target);
    }

    function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
        if (Platform.OS === 'android') {
            // Android fires onChange with 'set' or 'dismissed'
            setPickerTarget(null);
            if (event.type === 'set' && selected) {
                apply(selected);
            }
        } else {
            // iOS: update temp as user scrolls; confirm on "Done"
            if (selected) setTempDate(selected);
        }
    }

    function apply(date: Date) {
        if (pickerTarget === 'start') {
            setStartDate(date);
            // Reset end date if it's before the new start
            if (endDate && endDate < date) setEndDate(null);
        } else {
            setEndDate(date);
        }
    }

    function confirmIOS() {
        apply(tempDate);
        setPickerTarget(null);
    }

    function handleRecentSearch(label: string) {
        setDestination(label);
    }

    async function handleCreateTrip() {
        const userId = getSessionUserId();
        if (!userId) {
            router.replace('/login');
            return;
        }

        if (!destination || !startDate || !endDate) {
            alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await createTrip({
                tripName: destination,
                destination: destination,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                status: 'PLANNED',
            }, userId);

            // Navigate to itinerary upon success
            router.push('/(tabs)/itinerary');
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('Failed to connect to backend server. Make sure it is running on port 8080.');
        } finally {
            setLoading(false);
        }
    }

    const minEndDate = startDate ?? new Date();

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={palette.text} />
                </TouchableOpacity>
                <Text style={[Typography.titleLG, { color: palette.text }]}>New Trip</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Where to? */}
                <View style={styles.group}>
                    <Text style={[styles.label, { color: palette.text }]}>Where to?</Text>
                    <Input
                        value={destination}
                        onChangeText={setDestination}
                        placeholder="Search destinations"
                        leading={
                            <Ionicons
                                name="search-outline"
                                size={18}
                                color={palette.textMuted}
                                style={{ marginRight: Spacing.sm }}
                            />
                        }
                    />
                </View>

                {/* When? */}
                <View style={styles.group}>
                    <Text style={[styles.label, { color: palette.text }]}>When?</Text>
                    <View style={styles.dateRow}>
                        {/* Start Date */}
                        <Pressable
                            onPress={() => openPicker('start')}
                            style={[
                                styles.dateField,
                                {
                                    backgroundColor: palette.surface,
                                    borderColor: pickerTarget === 'start' ? palette.primary : palette.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={startDate ? palette.primary : palette.textMuted}
                            />
                            <Text
                                style={[
                                    Typography.body,
                                    { color: startDate ? palette.text : palette.textMuted, flex: 1 },
                                ]}
                                numberOfLines={1}
                            >
                                {startDate ? formatDate(startDate) : 'Start Date'}
                            </Text>
                        </Pressable>

                        <Ionicons name="arrow-forward" size={18} color={palette.textMuted} />

                        {/* End Date */}
                        <Pressable
                            onPress={() => openPicker('end')}
                            style={[
                                styles.dateField,
                                {
                                    backgroundColor: palette.surface,
                                    borderColor: pickerTarget === 'end' ? palette.primary : palette.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={endDate ? palette.primary : palette.textMuted}
                            />
                            <Text
                                style={[
                                    Typography.body,
                                    { color: endDate ? palette.text : palette.textMuted, flex: 1 },
                                ]}
                                numberOfLines={1}
                            >
                                {endDate ? formatDate(endDate) : 'End Date'}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Duration label */}
                    {startDate && endDate && (
                        <View style={styles.durationRow}>
                            <Ionicons name="time-outline" size={14} color={palette.primary} />
                            <Text style={[Typography.caption, { color: palette.primary }]}>
                                {Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1} days
                            </Text>
                        </View>
                    )}
                </View>

                {/* Recent Searches */}
                <View style={styles.group}>
                    <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>RECENT SEARCHES</Text>
                    <View style={styles.chipRow}>
                        {recentSearches.map((item) => (
                            <Chip
                                key={item}
                                label={item}
                                selected={destination === item}
                                onPress={() => handleRecentSearch(item)}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* CTA */}
            <View style={[styles.footer, { borderTopColor: palette.border }]}>
                <Button
                    title="Create Trip →"
                    size="lg"
                    style={styles.ctaBtn}
                    onPress={handleCreateTrip}
                    loading={loading}
                />
            </View>

            {/* ─── Android DateTimePicker (renders inline when open) ────────────── */}
            {Platform.OS === 'android' && pickerTarget !== null && (
                <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    minimumDate={pickerTarget === 'end' ? minEndDate : new Date()}
                    onChange={onPickerChange}
                />
            )}

            {/* ─── iOS DateTimePicker in Modal ─────────────────────────────────── */}
            {Platform.OS === 'ios' && (
                <Modal
                    visible={pickerTarget !== null}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setPickerTarget(null)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setPickerTarget(null)} />
                    <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
                        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
                        <View style={styles.modalHeader}>
                            <Pressable onPress={() => setPickerTarget(null)}>
                                <Text style={[Typography.bodySemi, { color: palette.textMuted }]}>Cancel</Text>
                            </Pressable>
                            <Text style={[Typography.bodySemi, { color: palette.text }]}>
                                {pickerTarget === 'start' ? 'Start Date' : 'End Date'}
                            </Text>
                            <Pressable onPress={confirmIOS}>
                                <Text style={[Typography.bodySemi, { color: palette.primary }]}>Done</Text>
                            </Pressable>
                        </View>
                        <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="spinner"
                            minimumDate={pickerTarget === 'end' ? minEndDate : new Date()}
                            onChange={onPickerChange}
                            style={styles.iosPicker}
                        />
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl + Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.pill,
    },
    content: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        gap: Spacing.xl,
    },
    group: { gap: Spacing.sm },
    label: { ...Typography.bodySemi },
    sectionLabel: {
        ...Typography.caption,
        fontWeight: '600',
        letterSpacing: 0.8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dateField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderRadius: Radius.lg,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        ...Elevation.card,
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    footer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
    },
    ctaBtn: {
        width: '100%',
        borderRadius: Radius.pill,
    },
    // Modal (iOS)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        paddingBottom: Spacing.xl,
        ...Elevation.floating,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: Radius.pill,
        alignSelf: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    iosPicker: {
        width: '100%',
    },
});
