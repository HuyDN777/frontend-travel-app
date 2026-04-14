import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { acceptInvitation, declineInvitation, getPendingInvitations, type InviteCompanionRes } from '@/utils/api';
import { getSessionUser } from '@/utils/session';

export default function NotificationsScreen() {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const router = useRouter();
    const currentUser = getSessionUser();

    const [invitations, setInvitations] = useState<InviteCompanionRes[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            if (!currentUser) return;
            try {
                setLoading(true);
                const data = await getPendingInvitations();
                if (active) setInvitations(data);
            } catch (error) {
                console.error(error);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [currentUser]);

    const handleAccept = async (memberId: number) => {
        setProcessingId(memberId);
        try {
            await acceptInvitation(memberId);
            setInvitations(prev => prev.filter(inv => inv.memberId !== memberId));
            Alert.alert('Thành công', 'Bạn đã tham gia chuyến đi!');
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể chấp nhận lời mời');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (memberId: number) => {
        setProcessingId(memberId);
        try {
            await declineInvitation(memberId);
            setInvitations(prev => prev.filter(inv => inv.memberId !== memberId));
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể từ chối lời mời');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={palette.text} />
                </TouchableOpacity>
                <Text style={[Typography.titleLG, { color: palette.text }]}>Thông báo</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: Spacing.xl }} />
                ) : invitations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={64} color={palette.textMuted} />
                        <Text style={[Typography.body, { color: palette.textMuted, marginTop: Spacing.md }]}>
                            Bạn không có thông báo nào.
                        </Text>
                    </View>
                ) : (
                    invitations.map((inv) => (
                        <Card key={inv.memberId} style={styles.inviteCard}>
                            <View style={styles.inviteRow}>
                                <View style={[styles.iconWrap, { backgroundColor: palette.surface }]}>
                                    <Ionicons name="map-outline" size={20} color={palette.primary} />
                                </View>
                                <View style={styles.inviteInfo}>
                                    <Text style={[Typography.bodySemi, { color: palette.text }]}>
                                        Lời mời tham gia chuyến đi
                                    </Text>
                                    <Text style={[Typography.body, { color: palette.textMuted }]}>
                                        Bạn được mời tham gia chuyến đi{' '}
                                        <Text style={{ fontWeight: '600', color: palette.text }}>
                                            {inv.tripName}
                                        </Text>
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnDecline, { borderColor: palette.border }]}
                                    onPress={() => handleDecline(inv.memberId)}
                                    disabled={processingId === inv.memberId}
                                >
                                    <Text style={[Typography.bodySemi, { color: palette.text }]}>Từ chối</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.btn, styles.btnAccept, { backgroundColor: palette.primary }]}
                                    onPress={() => handleAccept(inv.memberId)}
                                    disabled={processingId === inv.memberId}
                                >
                                    {processingId === inv.memberId ? (
                                        <ActivityIndicator size="small" color="#0B1B18" />
                                    ) : (
                                        <Text style={[Typography.bodySemi, { color: '#0B1B18' }]}>Chấp nhận</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))
                )}
            </ScrollView>
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
        padding: Spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    inviteCard: {
        marginBottom: Spacing.md,
        padding: Spacing.md,
        ...Elevation.card,
    },
    inviteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteInfo: {
        flex: 1,
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    btn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDecline: {
        borderWidth: 1,
    },
    btnAccept: {
    },
});
