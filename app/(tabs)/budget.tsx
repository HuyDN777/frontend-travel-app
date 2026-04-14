import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function formatVND(raw: string): string {
    const num = parseInt(raw.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
}

export default function BudgetScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();

    // Nhận dữ liệu từ màn tạo chuyến đi
    const { tripName, destination, startDate, endDate } = useLocalSearchParams<{
        tripName: string;
        destination: string;
        startDate: string;
        endDate: string;
    }>();

    const [rawAmount, setRawAmount] = useState('');

    function handleChangeText(text: string) {
        const cleaned = text.replace(/\D/g, '');
        setRawAmount(cleaned);
    }

    function handleNext() {
        const amount = parseInt(rawAmount, 10);
        if (!amount || amount <= 0) {
            Alert.alert('Ngân sách không hợp lệ', 'Vui lòng nhập số tiền ngân sách.');
            return;
        }
        if (!destination || !startDate || !endDate) {
            Alert.alert('Lỗi', 'Thiếu thông tin chuyến đi. Vui lòng quay lại bước trước.');
            return;
        }
        // Chuyển sang màn lịch trình với toàn bộ dữ liệu chuyến đi
        router.push({
            pathname: '/(tabs)/itinerary',
            params: { tripName, destination, startDate, endDate, budget: rawAmount },
        });
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
                    <Text style={[Typography.bodySemi, { color: '#FFF' }]}>Thiết lập ngân sách</Text>
                </View>
            </View>

            {/* Budget Card */}
            <Card style={styles.card}>
                <View style={styles.cardInner}>
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: palette.background }]}>
                        <Ionicons name="wallet-outline" size={28} color={palette.primary} />
                    </View>

                    {destination ? (
                        <Text style={[Typography.caption, { color: palette.textMuted, textAlign: 'center' }]}>
                            Chuyến đi đến <Text style={{ color: palette.text, fontWeight: '700' }}>{destination}</Text>
                        </Text>
                    ) : null}

                    <Text style={[Typography.titleLG, styles.cardTitle, { color: palette.text }]}>
                        Tổng ngân sách{'\n'}cho chuyến đi này là bao nhiêu?
                    </Text>

                    {/* Amount input */}
                    <View
                        style={[
                            styles.amountWrap,
                            { backgroundColor: palette.background, borderColor: palette.border },
                        ]}
                    >
                        <TextInput
                            value={formatVND(rawAmount)}
                            onChangeText={handleChangeText}
                            keyboardType="numeric"
                            style={[styles.amountInput, { color: palette.text }]}
                            placeholder="0"
                            placeholderTextColor={palette.textMuted}
                        />
                        <Text style={[styles.currencySymbol, { color: palette.textMuted }]}>₫</Text>
                    </View>
                </View>
            </Card>

            {/* Next button */}
            <View style={[styles.footer, { borderTopColor: palette.border }]}>
                <Button
                    title="Tiếp theo →"
                    size="lg"
                    style={styles.footerBtn}
                    onPress={handleNext}
                />
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
