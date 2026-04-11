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
};
