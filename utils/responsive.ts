import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline sizes are based on standard ~iPhone 12 dimensions
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

const scale = width / guidelineBaseWidth;
const verticalScale = height / guidelineBaseHeight;

export function moderateScale(size: number, factor = 0.3) {
  return size + (scale * size - size) * factor;
}

export function moderateVertical(size: number, factor = 0.3) {
  return size + (verticalScale * size - size) * factor;
}

export function responsiveFont(size: number, factor = 0.3) {
  const scaled = moderateScale(size, factor);
  // Slightly temper fonts on very high fontScale devices so UI doesn't explode,
  // while still respecting user accessibility settings.
  const fontScale = PixelRatio.getFontScale();
  const cap = Math.min(fontScale, 1.2);
  return Math.round(scaled * (cap / fontScale));
}

