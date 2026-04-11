/**
 * Lưu tạm DayPlan sau khi người dùng xác nhận gợi ý AI.
 * Trong đồ án hoàn chỉnh: thay bằng đồng bộ API (Spring Boot + MySQL) sau khi đăng nhập.
 */
import type { DayPlan } from '@/types/aiItinerary';

let lastAppliedDayPlans: DayPlan[] | null = null;

export function applyDayPlansToDraft(plans: DayPlan[]) {
  lastAppliedDayPlans = plans;
}

export function getLastAppliedDayPlans(): DayPlan[] | null {
  return lastAppliedDayPlans;
}

export function clearLastAppliedDayPlans() {
  lastAppliedDayPlans = null;
}
