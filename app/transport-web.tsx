import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** UA giống Chrome mobile — một số site (VeXeRe) từ chối UA WebView mặc định hoặc load vô hạn. */
const WEBVIEW_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const LOAD_GIVE_UP_MS = 14_000;

export default function TransportWebScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const q = useLocalSearchParams<{ url?: string; title?: string; from?: string; to?: string; date?: string; operator?: string }>();

  const target = useMemo(() => {
    try {
      const raw = q.url != null ? decodeURIComponent(String(q.url)) : '';
      return raw.startsWith('http://') || raw.startsWith('https://') ? raw : '';
    } catch {
      return '';
    }
  }, [q.url]);

  const title = q.title != null ? String(q.title) : 'Đặt trên web';
  const fromParam = q.from ? decodeURIComponent(String(q.from)) : '';
  const toParam = q.to ? decodeURIComponent(String(q.to)) : '';
  const dateParam = q.date ? String(q.date) : '';
  const operatorParam = q.operator ? decodeURIComponent(String(q.operator)) : '';

  const [loadErr, setLoadErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadEndSeen = useRef(false);

  useEffect(() => {
    if (!target) {
      router.back();
    }
  }, [target, router]);

  useEffect(() => {
    loadEndSeen.current = false;
    setLoading(true);
    setLoadErr(false);
    const t = setTimeout(() => {
      if (!loadEndSeen.current) {
        setLoading(false);
      }
    }, LOAD_GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [target]);

  const hideSpinner = useCallback(() => {
    loadEndSeen.current = true;
    setLoading(false);
  }, []);

  const onNavStateChange = useCallback(
    (navState: { loading?: boolean }) => {
      if (navState.loading === false) {
        hideSpinner();
      }
    },
    [hideSpinner],
  );

  if (!target) {
    return null;
  }

  const injectedScript = useMemo(() => {
    const from = JSON.stringify(fromParam);
    const to = JSON.stringify(toParam);
    const date = JSON.stringify(dateParam);
    const operator = JSON.stringify(operatorParam);
    return `
      (function () {
        var from = ${from};
        var to = ${to};
        var date = ${date};
        var operator = ${operator};
        function setValueByHint(hints, value) {
          if (!value) return false;
          var all = Array.prototype.slice.call(document.querySelectorAll('input'));
          var found = all.find(function (el) {
            var p = (el.placeholder || '').toLowerCase();
            var a = (el.getAttribute('aria-label') || '').toLowerCase();
            return hints.some(function (h) { return p.includes(h) || a.includes(h); });
          });
          if (!found) return false;
          found.focus();
          found.value = value;
          found.dispatchEvent(new Event('input', { bubbles: true }));
          found.dispatchEvent(new Event('change', { bubbles: true }));
          found.blur();
          return true;
        }
        function tryFill() {
          setValueByHint(['xuat phat', 'noi di', 'departure', 'from'], from);
          setValueByHint(['noi den', 'den', 'arrival', 'to'], to);
          setValueByHint(['ngay di', 'date'], date);
          if (operator) {
            setValueByHint(['nha xe', 'operator', 'hang xe'], operator);
          }
          var buttons = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
          var searchBtn = buttons.find(function (el) {
            var t = (el.innerText || el.textContent || '').toLowerCase();
            return t.includes('tìm kiếm') || t.includes('search');
          });
          if (searchBtn) searchBtn.click();
        }
        setTimeout(tryFill, 800);
        setTimeout(tryFill, 1800);
        setTimeout(tryFill, 3200);
      })();
      true;
    `;
  }, [fromParam, toParam, dateParam, operatorParam]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title, headerBackTitle: 'Quay lại' }} />

      {loadErr ? (
        <View style={styles.fallback}>
          <Text style={[Typography.body, { color: palette.text }]}>
            Trang này không tải được trong app (chặn WebView). Bạn có thể mở bằng trình duyệt.
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(target)}
            style={[styles.openExternal, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[Typography.bodySemi, { color: palette.primary }]}>Mở trong trình duyệt</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.webWrap}>
          <WebView
            source={{ uri: target }}
            style={styles.web}
            userAgent={WEBVIEW_USER_AGENT}
            injectedJavaScript={injectedScript}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={hideSpinner}
            onNavigationStateChange={onNavStateChange}
            onError={() => {
              setLoadErr(true);
              hideSpinner();
            }}
            startInLoadingState
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
          />
          {loading ? (
            <View style={[styles.loadingOverlay, { backgroundColor: palette.background }]} pointerEvents="none">
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={[Typography.caption, { color: palette.textMuted, marginTop: Spacing.sm }]}>
                Đang tải trang…
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webWrap: { flex: 1 },
  web: { flex: 1, opacity: 0.99 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  fallback: { flex: 1, padding: Spacing.lg, gap: Spacing.md, justifyContent: 'center' },
  openExternal: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
});
