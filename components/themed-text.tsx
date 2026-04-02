import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { responsiveFont } from '@/utils/responsive';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? { fontSize: responsiveFont(16), lineHeight: responsiveFont(24) } : undefined,
        type === 'title'
          ? { fontSize: responsiveFont(32), lineHeight: responsiveFont(36), fontWeight: 'bold' }
          : undefined,
        type === 'defaultSemiBold'
          ? { fontSize: responsiveFont(16), lineHeight: responsiveFont(24), fontWeight: '600' }
          : undefined,
        type === 'subtitle'
          ? { fontSize: responsiveFont(20), lineHeight: responsiveFont(26), fontWeight: 'bold' }
          : undefined,
        type === 'link'
          ? { lineHeight: responsiveFont(30), fontSize: responsiveFont(16), color: '#0a7ea4' }
          : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({});
