// Force light mode for now so UI matches Figma during development.
// Switch back to system scheme later by exporting from 'react-native'.
import type { ColorSchemeName } from 'react-native';
export function useColorScheme(): ColorSchemeName {
  return 'light';
}
