// Force light mode for now so UI matches Figma during development.
// Switch back to system scheme later by exporting from 'react-native'.
export function useColorScheme() {
  return 'light' as const;
}
