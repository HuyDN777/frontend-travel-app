import Ionicons from '@expo/vector-icons/Ionicons';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { usePathname, useRouter } from 'expo-router';

import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { clearSessionUser } from '@/utils/session';

type AdminShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}>;

type NavItem = {
  key: string;
  label: string;
  route: '/admin' | '/admin/users' | '/admin/moderation' | '/admin/settings';
  icon: keyof typeof Ionicons.glyphMap;
};

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/admin', icon: 'grid-outline' },
  { key: 'users', label: 'Users', route: '/admin/users', icon: 'people-outline' },
  { key: 'moderation', label: 'Posts', route: '/admin/moderation', icon: 'shield-checkmark-outline' },
  { key: 'settings', label: 'Settings', route: '/admin/settings', icon: 'settings-outline' },
];

const mobilePrimaryNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/admin', icon: 'shield-checkmark-outline' },
];

function isActivePath(pathname: string, route: NavItem['route']) {
  if (route === '/admin') {
    return pathname === '/admin';
  }

  return pathname.startsWith(route);
}

export function AdminShell({ title, subtitle, rightAction, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const desktop = width >= 920;

  function handleLogout() {
    clearSessionUser();
    router.replace('/login');
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}> 
      <View style={styles.frame}> 
        {desktop ? (
          <View style={[styles.sidebar, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <View style={styles.sidebarTop}>
              <View style={[styles.brandIcon, { backgroundColor: palette.primary }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#0B1B18" />
              </View>
              <Text style={[Typography.titleLG, { color: palette.text }]}>Admin Hub</Text>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>
                Quản trị tách biệt khỏi giao diện người dùng.
              </Text>
            </View>
            <View style={styles.navList}>
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.route);
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => router.replace(item.route)}
                    style={[
                      styles.navItem,
                      {
                        backgroundColor: active ? palette.primary : palette.surface,
                        borderColor: active ? palette.primaryPressed : palette.border,
                      },
                    ]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={active ? '#0B1B18' : palette.textMuted}
                    />
                    <Text style={[Typography.bodySemi, { color: active ? '#0B1B18' : palette.text }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={handleLogout}
              style={[styles.logoutBtn, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}> 
              <Ionicons name="log-out-outline" size={18} color={palette.text} />
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Đăng xuất</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.contentWrap}>
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.titleLG, { color: palette.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[Typography.caption, { color: palette.textMuted, marginTop: Spacing.xs }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.topActions}>
              <View style={[styles.statusPill, { backgroundColor: '#2F3338' }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>ADMIN STATUS: ACTIVE</Text>
              </View>
              {rightAction}
            </View>
          </View>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, !desktop && { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
      {!desktop ? (
        <View style={[styles.bottomNav, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          {mobilePrimaryNav.map((item) => {
            const active = isActivePath(pathname, item.route);
            return (
              <Pressable key={item.key} onPress={() => router.replace(item.route)} style={styles.bottomItem}>
                <View
                  style={[
                    styles.bottomIcon,
                    { backgroundColor: active ? palette.primary : 'transparent' },
                  ]}>
                  <Ionicons name={item.icon} size={20} color={active ? '#0B1B18' : palette.text} />
                </View>
              </Pressable>
            );
          })}
          <Pressable onPress={handleLogout} style={styles.bottomItem}>
            <View style={styles.bottomIcon}>
              <Ionicons name="log-out-outline" size={20} color={palette.text} />
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  frame: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 272,
    borderRightWidth: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
  },
  sidebarTop: {
    gap: Spacing.md,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navList: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 52,
  },
  contentWrap: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B8F2EA',
  },
  statusPillText: {
    color: '#D9F7F2',
    fontSize: 11,
    fontWeight: '700',
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  bottomNav: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Elevation.floating,
  },
  bottomItem: {
    alignItems: 'center',
    minWidth: 58,
  },
  bottomIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingLogout: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 86,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.floating,
  },
});
