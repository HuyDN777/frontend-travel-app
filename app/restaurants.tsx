import { PlacesSearchView } from '@/components/places/PlacesSearchView';

const REST_HERO =
  'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80';

export default function RestaurantsScreen() {
  return (
    <PlacesSearchView
      kind="restaurant"
      heroUri={REST_HERO}
      defaultLocation="Đà Nẵng"
      searchButtonLabel="Tìm nhà hàng theo địa danh"
      textSearchRadiusM={3500}
      gpsRadiusM={2000}
    />
  );
}
