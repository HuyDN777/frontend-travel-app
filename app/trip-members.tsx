import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTripMembers, inviteCompanion, type InviteCompanionRes } from '@/utils/api';
import { getSessionUser } from '@/utils/session';

// Trạng thái lời mời
function statusLabel(status: number): string {
    if (status === 1) return 'Đã tham gia';
    if (status === 0) return 'Đang chờ';
    return 'Đã từ chối';
}

function statusColor(status: number, primaryColor: string, textMuted: string): string {
    if (status === 1) return primaryColor;
    return textMuted;
}

export default function TripMembersScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();

    const { tripId, destination } = useLocalSearchParams<{
        tripId: string;
        destination: string;
    }>();

    const currentUser = getSessionUser();
    const [members, setMembers] = useState<InviteCompanionRes[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    const numericTripId = Number(tripId);

    useEffect(() => {
        if (!numericTripId) return;
        let active = true;
        (async () => {
            try {
                setLoading(true);
                const data = await getTripMembers(numericTripId);
                if (active) setMembers(data);
            } catch {
                // Im lặng nếu lỗi (trip mới chưa có thành viên)
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [numericTripId]);

    async function handleInvite() {
        const trimmed = email.trim();
        if (!trimmed) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ email.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            Alert.alert('Email không hợp lệ', 'Vui lòng nhập địa chỉ email đúng định dạng.');
            return;
        }
        if (!numericTripId) {
            Alert.alert('Lỗi', 'Không tìm thấy ID chuyến đi.');
            return;
        }

        setInviting(true);
        try {
            const res = await inviteCompanion(numericTripId, { inviteeEmail: trimmed });
            setMembers((prev) => [...prev, res]);
            setEmail('');
            Alert.alert('Đã gửi lời mời ✉️', `Lời mời đã được gửi đến ${trimmed}`);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message ?? 'Không thể gửi lời mời. Hãy kiểm tra kết nối.');
        } finally {
            setInviting(false);
        }
    }

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <Pressable onPress={() => router.replace('/(tabs)/profile')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={palette.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={[Typography.titleLG, { color: palette.text }]}>Mời bạn đồng hành</Text>
                    {destination ? (
                        <Text style={[Typography.caption, { color: palette.textMuted }]}>
                            Chuyến đi đến {destination}
                        </Text>
                    ) : null}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Thông tin chủ chuyến đi */}
                <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
                    CHỦ CHUYẾN ĐI
                </Text>
                <Card style={styles.ownerCard}>
                    <View style={styles.memberRow}>
                        <Image
                            source={{
                                uri: (() => {
                                    const url = currentUser?.avatarUrl;
                                    if (!url || typeof url !== 'string') return 'https://i.pravatar.cc/100?img=12';
                                    const t = url.trim();
                                    if (t === '' || t === 'null' || t === 'undefined' || !t.startsWith('http')) return 'https://i.pravatar.cc/100?img=12';
                                    return t;
                                })()
                            }}
                            style={styles.avatar}
                            contentFit="cover"
                        />
                        <View style={styles.memberInfo}>
                            <Text style={[Typography.bodySemi, { color: palette.text }]}>
                                {currentUser?.fullName || currentUser?.username || 'Bạn'}
                            </Text>
                            <Text style={[Typography.caption, { color: palette.textMuted }]}>
                                {currentUser?.email || 'Chủ chuyến đi'}
                            </Text>
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: palette.primary }]}>
                            <Text style={{ color: '#0B1B18', fontSize: 11, fontWeight: '700' }}>Chủ</Text>
                        </View>
                    </View>
                </Card>

                {/* Mời bạn */}
                <Text style={[styles.sectionLabel, { color: palette.textMuted, marginTop: Spacing.xl }]}>
                    MỜI BẠN ĐỒNG HÀNH
                </Text>
                <Card style={styles.inviteCard}>
                    <View style={styles.inviteRow}>
                        <Ionicons name="mail-outline" size={18} color={palette.textMuted} style={{ marginTop: 2 }} />
                        <TextInput
                            style={[styles.emailInput, { color: palette.text }]}
                            placeholder="Nhập email người muốn mời..."
                            placeholderTextColor={palette.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!inviting}
                        />
                        <Pressable
                            onPress={handleInvite}
                            disabled={inviting}
                            style={[
                                styles.inviteBtn,
                                { backgroundColor: palette.primary, opacity: inviting ? 0.6 : 1 },
                            ]}
                        >
                            {inviting ? (
                                <ActivityIndicator size="small" color="#0B1B18" />
                            ) : (
                                <Text style={{ color: '#0B1B18', fontWeight: '700', fontSize: 13 }}>Mời</Text>
                            )}
                        </Pressable>
                    </View>
                </Card>

                {/* Danh sách đã mời */}
                {(loading || members.length > 0) && (
                    <>
                        <Text style={[styles.sectionLabel, { color: palette.textMuted, marginTop: Spacing.xl }]}>
                            NGƯỜI ĐÃ MỜI
                        </Text>
                        {loading ? (
                            <ActivityIndicator color={palette.primary} style={{ marginTop: Spacing.md }} />
                        ) : (
                            members.map((m) => (
                                <Card key={m.memberId} style={styles.memberCard}>
                                    <View style={styles.memberRow}>
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: palette.surface }]}>
                                            <Ionicons name="person-outline" size={20} color={palette.textMuted} />
                                        </View>
                                        <View style={styles.memberInfo}>
                                            <Text style={[Typography.bodySemi, { color: palette.text }]}>
                                                {m.inviteeName || m.inviteeEmail}
                                            </Text>
                                            <Text style={[Typography.caption, { color: palette.textMuted }]}>
                                                {m.inviteeEmail}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                Typography.caption,
                                                {
                                                    color: statusColor(m.status, palette.primary, palette.textMuted),
                                                    fontWeight: '600',
                                                },
                                            ]}
                                        >
                                            {statusLabel(m.status)}
                                        </Text>
                                    </View>
                                </Card>
                            ))
                        )}
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <Button
                    title="Xong →"
                    size="lg"
                    style={styles.doneBtn}
                    onPress={() => router.replace('/(tabs)/profile')}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
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
    },
    content: {
        padding: Spacing.lg,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
    },
    ownerCard: {
        marginBottom: 0,
    },
    inviteCard: {
        marginBottom: 0,
    },
    memberCard: {
        marginBottom: Spacing.sm,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberInfo: {
        flex: 1,
        gap: 2,
    },
    roleBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.pill,
    },
    inviteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    emailInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 4,
    },
    inviteBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.lg,
        minWidth: 56,
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
    doneBtn: {
        width: '100%',
        borderRadius: Radius.pill,
    },
});
