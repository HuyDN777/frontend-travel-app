import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PRESETS = [
    { label: '¥100k', value: 100000 },
    { label: '¥200k', value: 200000 },
    { label: '¥300k', value: 300000 },
    { label: '¥500k', value: 500000 },
    { label: '¥1M', value: 1000000 },
];

export default function BudgetScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();
    const [amount, setAmount] = useState('250000');

    function handlePreset(value: number) {
        setAmount(String(value));
    }

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Hero Image */}
            <View style={styles.heroContainer}>
                <Image
                    source={{
                        uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
                    }}
                    style={styles.heroImage}
                    contentFit="cover"
                />
                {/* Back button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
                >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>
                {/* Title overlay */}
                <View style={styles.heroBadge}>
                    <Text style={[Typography.bodySemi, { color: '#FFF' }]}>Set Trip Budget</Text>
                </View>
            </View>

            {/* Budget Card */}
            <Card style={styles.card}>
                <View style={styles.cardInner}>
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: palette.background }]}>
                        <Ionicons name="wallet-outline" size={28} color={palette.primary} />
                    </View>

                    <Text style={[Typography.titleLG, styles.cardTitle, { color: palette.text }]}>
                        What is your total{'\n'}budget for this trip?
                    </Text>

                    {/* Amount input */}
                    <View
                        style={[
                            styles.amountWrap,
                            { backgroundColor: palette.background, borderColor: palette.border },
                        ]}
                    >
                        <Text style={[styles.currencySymbol, { color: palette.textMuted }]}>¥</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            style={[styles.amountInput, { color: palette.text }]}
                        />
                    </View>

                    {/* Preset chips */}
                    <View style={styles.presetGrid}>
                        {PRESETS.map((p) => (
                            <Chip
                                key={p.label}
                                label={p.label}
                                selected={amount === String(p.value)}
                                onPress={() => handlePreset(p.value)}
                            />
                        ))}
                    </View>
                </View>
            </Card>

            {/* Next button */}
            <View style={[styles.footer, { borderTopColor: palette.border }]}>
                <Button title="Next →" size="lg" style={styles.footerBtn} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    heroContainer: {
        height: 260,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    backBtn: {
        position: 'absolute',
        top: Spacing.xl + Spacing.lg,
        left: Spacing.lg,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        ...Elevation.card,
    },
    heroBadge: {
        position: 'absolute',
        bottom: Spacing.lg,
        alignSelf: 'center',
    },
    card: {
        marginHorizontal: Spacing.lg,
        marginTop: -Spacing.xl,
        ...Elevation.floating,
    },
    cardInner: {
        alignItems: 'center',
        gap: Spacing.lg,
        paddingVertical: Spacing.xl,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        textAlign: 'center',
        lineHeight: 30,
    },
    amountWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderRadius: Radius.lg,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    currencySymbol: {
        ...Typography.titleLG,
        fontSize: 28,
    },
    amountInput: {
        flex: 1,
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
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
});
