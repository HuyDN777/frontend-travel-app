/**
 * Kiểu dữ liệu gợi ý lịch AI (UC-04) và DayPlan nháp.
 * Giữ đồng bộ với DTO JSON phía Spring Boot để báo cáo / tích hợp rõ ràng.
 */

export type BudgetTier = 'low' | 'medium' | 'high';

export type ActivityLevel = 'it' | 'vua';

export type AiItineraryRequest = {
  destination: string;
  dayCount: number;
  preferences: string[];
  budgetTier: BudgetTier;
  activityLevel?: ActivityLevel;
  /** ISO date bắt đầu (tuỳ chọn, để hiển thị ngữ cảnh) */
  startDate?: string;
};

export type SuggestedRestaurant = {
  id: string;
  name: string;
  note?: string;
  description?: string;
  address?: string;
  type?: string;
  hours?: string;
  priceRange?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  mapLink?: string;
};

export type SuggestedActivity = {
  id: string;
  title: string;
  description?: string;
  /** Ví dụ "2h", "Buổi sáng" */
  estimatedDuration: string;
  /** Gợi ý giờ bắt đầu, ví dụ "08:00" */
  suggestedStart?: string;
  address?: string;
  type?: string;
  hours?: string;
  priceRange?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  mapLink?: string;
};

export type SuggestedDay = {
  dayIndex: number;
  label: string;
  activities: SuggestedActivity[];
  restaurants: SuggestedRestaurant[];
};

export type AiItineraryResponse = {
  summary: string;
  days: SuggestedDay[];
  /** Metadata phục vụ debug / hiển thị */
  generatedAt: string;
};

/** Hoạt động đã chấp nhận trong kế hoạch nháp */
export type DayPlanActivity = {
  id: string;
  title: string;
  description?: string;
  estimatedDuration: string;
  suggestedStart?: string;
};

/** Một ngày trong kế hoạch (draft) sau khi chấp nhận gợi ý */
export type DayPlan = {
  dayIndex: number;
  label: string;
  activities: DayPlanActivity[];
  restaurantNotes: string[];
};
