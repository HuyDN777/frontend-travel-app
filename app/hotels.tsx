import { PlacesSearchView } from '@/components/places/PlacesSearchView';

const HOTEL_HERO =
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80';

export default function HotelsScreen() {
  return (
    <PlacesSearchView
      kind="hotel"
      heroUri={HOTEL_HERO}
      defaultLocation="Đà Nẵng"
      searchButtonLabel="Tìm khách sạn theo địa danh"
      textSearchRadiusM={5000}
      gpsRadiusM={2500}
    />
  );
}
