import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NameTripScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();

    const [tripName, setTripName] = useState('');

    function handleNext() {
        const trimmed = tripName.trim();
        if (!trimmed) {
            alert('Vui lòng nhập tên chuyến đi của bạn');
            return;
        }

        router.push({
            pathname: '/(tabs)/create-trip',
            params: { tripName: trimmed },
        });
    }

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={palette.text} />
                </TouchableOpacity>
                <Text style={[Typography.titleLG, { color: palette.text }]}>Tên chuyến đi</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.form}>
                    <Text style={[styles.label, { color: palette.text }]}>
                        Tên chuyến đi của bạn là gì?
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: palette.surface,
                                color: palette.text,
                                borderColor: palette.border
                            }
                        ]}
                        placeholder="VD: Khám phá mùa hè, Trăng mật..."
                        placeholderTextColor={palette.textMuted}
                        value={tripName}
                        onChangeText={setTripName}
                        autoFocus
                    />
                </View>

                <View style={{ flex: 1 }} />

                <Button
                    title="Tiếp theo →"
                    size="lg"
                    style={{ borderRadius: Radius.pill, marginBottom: Spacing.xl + Spacing.md }}
                    onPress={handleNext}
                />
            </KeyboardAvoidingView>
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
        padding: Spacing.xs,
    },
    content: {
        flex: 1,
        padding: Spacing.lg,
    },
    form: {
        marginTop: Spacing.xl,
        gap: Spacing.md,
    },
    label: {
        fontSize: 18,
        fontWeight: '700',
    },
    input: {
        height: 56,
        borderWidth: 1,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md,
        fontSize: 16,
    },
});
