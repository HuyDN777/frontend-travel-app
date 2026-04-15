export type FlightSearchParams = {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  nonStop?: boolean;
  currencyCode?: string;
  maxPrice?: number;
  max?: number;
};

export type PaymentInitiateReq = {
  provider: 'VNPAY' | 'MOMO';
  amount?: number;
  orderInfo?: string;
  returnUrl?: string;
  ipnUrl?: string;
  requestType?: string;
};

export type PaymentInitiateRes = {
  bookingId: number;
  provider: string;
  transactionNo: string;
  paymentUrl: string;
  status: string;
};

export type FlightBookingReq = {
  userId: number;
  totalAmount: number;
  paymentStatus?: string;
  pnrCode?: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
};

export type BookingMasterRes = {
  id: number;
  totalAmount: number;
  paymentStatus: string;
  tripId: number;
  userId: number;
  /** FLIGHT | HOTEL | RESTAURANT | COACH | OTHER */
  category?: string;
  /** Ma khach dua nha hang / khach san / xe de doi soat */
  verifyCode?: string;
  summaryTitle?: string | null;
  summaryDetail?: string | null;
};

export type PlaceNearRes = {
  osmType: string;
  osmId: string;
  kind: string;
  name: string;
  addressLine: string;
  lat: number;
  lon: number;
  openStreetMapUrl: string;
  /** Ảnh từ tag OSM (image / wikimedia_commons), có thể không có */
  previewImageUrl?: string | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: string | null;
  cuisine?: string | null;
  description?: string | null;
  /** Có khi nguồn SerpAPI / Google Maps local */
  rating?: number | null;
};

/** Phản hồi GET `/places/maps-enrich` — bổ sung từ SerpAPI khi thiếu trên OSM. */
export type PlaceMapsEnrichRes = {
  phone?: string | null;
  website?: string | null;
  bookingLink?: string | null;
  openingHours?: string | null;
  openNow?: boolean | null;
  openState?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  gpsLat?: number | null;
  gpsLon?: number | null;
  amenities?: string[] | null;
  reviews?: Array<{
    user?: string | null;
    summary?: string | null;
    rating?: number | null;
    relativeDate?: string | null;
  }> | null;
  typeLabel?: string | null;
  snippet?: string | null;
  description?: string | null;
  price?: string | null;
};

/** Một dòng trong `local_results` (SerpAPI Google Maps / JSON tương thích). */
export type PlacesNearbyLocalResult = {
  title?: string;
  name?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  serpapi_thumbnail?: string;
};

export type PlacesNearbySerpLikeResponse = {
  local_results?: PlacesNearbyLocalResult[];
};

export type CoachBookingReq = {
  userId: number;
  totalAmount: number;
  paymentStatus?: string;
  name: string;
  seat?: string;
  pickUp: string;
  dropOff: string;
  plateNumber?: string;
  departureDate: string;
  departureTime: string;
};

export type BudgetRow = {
  id: number;
  category: string;
  limitAmount: number;
  tripId: number;
};

export type ExpenseRow = {
  id: number;
  amount: number;
  category: string;
  description?: string | null;
  tripId: number;
  userId: number;
};

export type TripBalanceRes = {
  budgetTotal: number;
  expenseTotal: number;
  remainingBalance: number;
};

export type CategoryAnalyticsRes = {
  category: string;
  spent: number;
  percentage: number;
  transactionCount: number;
};

export type BudgetUpsertReq = {
  category: string;
  limitAmount: number;
};

export type ExpenseCreateReq = {
  userId: number;
  amount: number;
  category: string;
  description?: string;
};
