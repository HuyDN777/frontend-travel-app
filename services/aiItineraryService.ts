/**
 * Dịch vụ gợi ý lịch AI — UC-04 (bài tập lớn).
 *
 * - Có URL hợp lệ (biến môi trường hoặc app.json extra): POST JSON tới Spring Boot,
 *   response phải khớp AiItineraryResponse (xem types/aiItinerary.ts và BAO_CAO_PHAN_4.md).
 * - Không cấu hình URL: mock cục bộ, cùng schema, phù hợp demo / quay video báo cáo.
 */
import Constants from 'expo-constants';

import type {
  AiItineraryRequest,
  AiItineraryResponse,
  BudgetTier,
  SuggestedActivity,
  SuggestedDay,
  SuggestedRestaurant,
} from '@/types/aiItinerary';
import { searchKnowledge, searchCityData, TourismItem, LocalResult } from './knowledgeService';

function isUnreachableLocalhost(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('localhost') || u.includes('127.0.0.1');
}

/** Cùng logic IP dev với app chính — điện thoại không dùng được localhost trong extra. */
function resolveBackendLanBase(): string | undefined {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra?.expoClient
      ?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:8080`;
  }
  return undefined;
}

function resolveAiItineraryUrl(): string | undefined {
  const env =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AI_ITINERARY_URL
      ? String(process.env.EXPO_PUBLIC_AI_ITINERARY_URL).trim()
      : '';
  if (env) return env;

  const extra = (
    Constants.expoConfig?.extra as { aiItineraryUrl?: string } | undefined
  )?.aiItineraryUrl?.trim();
  if (extra && !isUnreachableLocalhost(extra)) {
    return extra;
  }

  const lan = resolveBackendLanBase();
  if (lan) {
    return `${lan}/api/v1/ai/itinerary`;
  }

  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return 'http://localhost:8080/api/v1/ai/itinerary';
    }
  }

  return undefined;
}

const API_URL = resolveAiItineraryUrl();

function resolveAiBaseUrl(): string | undefined {
  if (!API_URL) return undefined;
  try {
    const u = new URL(API_URL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}

const API_BASE_URL = resolveAiBaseUrl();

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function id(prefix: string, i: number, j?: number) {
  return j !== undefined ? `${prefix}-${i}-${j}` : `${prefix}-${i}`;
}

function danangPool(
  dayIndex: number,
  vegetarian: boolean,
  budget: BudgetTier,
): { activities: SuggestedActivity[]; restaurants: SuggestedRestaurant[] } {
  const pools: Record<
    number,
    { activities: Omit<SuggestedActivity, 'id'>[]; restaurants: Omit<SuggestedRestaurant, 'id'>[] }
  > = {
    1: {
      activities: [
        {
          title: 'Bãi biển Mỹ Khê',
          description: 'Tắm biển, đi bộ sáng; phù hợp khởi động chuyến đi.',
          estimatedDuration: '2–3h',
          suggestedStart: '07:00',
        },
        {
          title: 'Bảo tàng Chăm',
          description: 'Tìm hiểu văn hóa Chăm Pa, gần trung tâm.',
          estimatedDuration: '1.5h',
          suggestedStart: '10:30',
        },
        {
          title: 'Cầu Rồng & ven sông Hàn',
          description: 'Dạo chiều, chờ cầu phun lửa (cuối tuần).',
          estimatedDuration: '2h',
          suggestedStart: '17:00',
        },
      ],
      restaurants: vegetarian
        ? [
            { name: 'Nhà hàng chay An Hiền', note: 'Cơm chay, nem cuốn' },
            { name: 'Chay Veggie', note: 'Buffet chay buổi trưa' },
          ]
        : [
            { name: 'Bánh xèo Bà Dưỡng', note: 'Đặc sản Đà Nẵng' },
            { name: 'Mì Quảng Bà Mua', note: 'Buổi trưa nhẹ' },
          ],
    },
    2: {
      activities: [
        {
          title: 'Bà Nà Hills',
          description: 'Cáp treo, Làng Pháp, Cầu Vàng — nên đi cả ngày.',
          estimatedDuration: '8h',
          suggestedStart: '07:30',
        },
      ],
      restaurants: [
        { name: 'Buffet trên Bà Nà', note: budget === 'low' ? 'Có thể mang đồ ăn nhẹ' : 'Buffet tour' },
        vegetarian
          ? { name: 'Quán chay gần cáp treo', note: 'Hỏi lễ tân khu du lịch' }
          : { name: 'Beer Plaza Bà Nà', note: 'Ăn tối trước khi xuống' },
      ],
    },
    3: {
      activities: [
        {
          title: 'Ngũ Hành Sơn',
          description: 'Chùa, hang động, view biển từ đỉnh.',
          estimatedDuration: '3h',
          suggestedStart: '08:00',
        },
        {
          title: 'Làng nghề Non Nước',
          description: 'Đá mỹ nghệ, mua quà lưu niệm.',
          estimatedDuration: '1h',
          suggestedStart: '11:30',
        },
        {
          title: 'Biển Non Nước',
          description: 'Nghỉ chiều, cà phê view biển.',
          estimatedDuration: '2h',
          suggestedStart: '15:00',
        },
      ],
      restaurants: vegetarian
        ? [
            { name: 'Cơm chay Hoa Sen', note: 'Gần chân núi' },
            { name: 'Quán chay Hải Châu', note: 'Tối tại trung tâm' },
          ]
        : [
            { name: 'Hải sản Mộc', note: budget === 'high' ? 'Hải sản tươi' : 'Chọn món vừa phải' },
            { name: 'Bánh tráng thịt heo', note: 'Ăn vặt chiều' },
          ],
    },
    4: {
      activities: [
        {
          title: 'Bán đảo Sơn Trà (Linh Ứng)',
          description: 'Tượng Quan Âm, rừng Sơn Trà, có thể gặp voọc.',
          estimatedDuration: '3h',
          suggestedStart: '07:00',
        },
        {
          title: 'Ghềnh Bàng / Bãi Bụt',
          description: 'Nếu thích khám phá nhẹ, kiểm tra thủy triều.',
          estimatedDuration: '2h',
          suggestedStart: '11:00',
        },
        {
          title: 'Helio / Asia Park (tuỳ chọn)',
          description: 'Giải trí buổi tối, phù hợp gia đình.',
          estimatedDuration: '3h',
          suggestedStart: '18:00',
        },
      ],
      restaurants: [
        { name: vegetarian ? 'Chay Garden' : 'Nhà hàng Cá Chuồn', note: 'Gần biển' },
        { name: 'Chợ đêm Sơn Trà', note: 'Ăn vặt' },
      ],
    },
    5: {
      activities: [
        {
          title: 'Hội An (ngày trip)',
          description: 'Phố cổ, chùa Cầu, thuyền sông Hoài.',
          estimatedDuration: 'Cả ngày',
          suggestedStart: '08:00',
        },
      ],
      restaurants: vegetarian
        ? [
            { name: 'Minh Hương Chay', note: 'Phố cổ Hội An' },
            { name: 'Chay Vegan', note: 'Bữa tối' },
          ]
        : [
            { name: 'Cao lầu Thanh', note: 'Đặc sản' },
            { name: 'White Rose Restaurant', note: 'Hoành thánh' },
          ],
    },
  };

  const key = Math.min(Math.max(dayIndex, 1), 5);
  const block = pools[key];
  const activities: SuggestedActivity[] = block.activities.map((a, j) => ({
    ...a,
    id: id('act', key, j),
  }));
  const restaurants: SuggestedRestaurant[] = block.restaurants.map((r, j) => ({
    ...r,
    id: id('rest', key, j),
  }));
  return { activities, restaurants };
}

function genericDay(
  dayIndex: number,
  destination: string,
  vegetarian: boolean,
  budget: BudgetTier,
): { activities: SuggestedActivity[]; restaurants: SuggestedRestaurant[] } {
  const budgetHint =
    budget === 'low' ? 'ưu tiên điểm miễn phí / giá mềm' : budget === 'high' ? 'có thể thêm tour riêng' : 'cân bằng chi phí';
  return {
    activities: [
      {
        id: id('act', dayIndex, 0),
        title: `Tham quan trung tâm ${destination}`,
        description: `Buổi sáng: đi bộ khu trung tâm, ${budgetHint}.`,
        estimatedDuration: '2–3h',
        suggestedStart: '09:00',
      },
      {
        id: id('act', dayIndex, 1),
        title: `Điểm nổi bật địa phương`,
        description: 'Chiều: museum, công viên hoặc viewpoint — tuỳ sở thích.',
        estimatedDuration: '2h',
        suggestedStart: '14:00',
      },
      {
        id: id('act', dayIndex, 2),
        title: 'Ẩm thực & nghỉ ngơi',
        description: 'Tối: thử món đặc sản, dạo phố.',
        estimatedDuration: '2h',
        suggestedStart: '18:30',
      },
    ],
    restaurants: vegetarian
      ? [
          { id: id('rest', dayIndex, 0), name: 'Nhà hàng chay địa phương', note: 'Đặt bàn nếu cuối tuần' },
          { id: id('rest', dayIndex, 1), name: 'Quán chay gần khách sạn', note: 'Hỏi lễ tân' },
        ]
      : [
          { id: id('rest', dayIndex, 0), name: `Đặc sản ${destination}`, note: 'Quán đông khách' },
          { id: id('rest', dayIndex, 1), name: 'Street food buổi tối', note: budget === 'low' ? 'Tiết kiệm' : 'Trải nghiệm' },
        ],
  };
}

function formatDayLabel(isoStart: string, offset: number): string {
  const t = new Date(isoStart);
  t.setDate(t.getDate() + offset);
  return `Ngày ${offset + 1} — ${t.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}`;
}

/**
 * Shuffle an array
 */
function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function getMapLink(title: string, placeId?: string): string {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`;
}

/**
 * Tạo phản hồi từ dữ liệu thực trong JSON.
 */
async function buildResponseFromKnowledge(req: AiItineraryRequest): Promise<AiItineraryResponse> {
  const dest = req.destination.trim();
  const vegetarian = req.preferences.some((p) => /chay|vegetarian|vegan/i.test(p));
  const maxDays = Math.min(req.dayCount, 14);

  // 1. Thử lấy dữ liệu từ các bộ Dataset thành phố mới (8 thành phố)
  const cityTourism = searchCityData(dest, 'tourism');
  const cityRestaurants = searchCityData(dest, 'restaurant');
  const cityCafes = searchCityData(dest, 'cafe');

  const days: SuggestedDay[] = [];

  if (cityTourism.length > 0) {
    // SỬ DỤNG DỮ LIỆU THÀNH PHỐ MỚI
    const shuffledTourism = shuffle(cityTourism);
    const shuffledFood = shuffle([...cityRestaurants, ...cityCafes]);

    for (let d = 1; d <= maxDays; d++) {
      // Mỗi ngày lấy 3-4 địa điểm tham quan
      const dayActivitiesRaw = shuffledTourism.slice((d - 1) * 3, d * 3 + 1); // 4 items (idx 0 to 3)
      const activities: SuggestedActivity[] = dayActivitiesRaw.map((item, idx) => ({
        id: id('act', d, idx),
        title: item.title,
        description: item.description || `${item.type || 'Địa điểm'} tại ${dest}`,
        estimatedDuration: '1.5-2h',
        suggestedStart: 
          idx === 0 ? '08:30' : 
          idx === 1 ? '10:30' : 
          idx === 2 ? '14:30' : '16:30',
        rating: item.rating,
        reviews: item.reviews,
        thumbnail: item.thumbnail,
        mapLink: getMapLink(item.title, item.place_id),
      }));

      // Gợi ý nhà hàng
      const restIdx = (d - 1) * 2 % (shuffledFood.length || 1);
      const restIdx2 = (d - 1) * 2 + 1 % (shuffledFood.length || 1);
      
      const dayRest1 = shuffledFood[restIdx];
      const dayRest2 = shuffledFood[restIdx2];

      const restaurants: SuggestedRestaurant[] = [];
      if (dayRest1) {
        restaurants.push({
          id: id('rest', d, 0),
          name: dayRest1.title,
          note: `${dayRest1.type || 'Ẩm thực'} - ${dayRest1.address || 'Địa chỉ trong thành phố'}`,
          rating: dayRest1.rating,
          reviews: dayRest1.reviews,
          thumbnail: dayRest1.thumbnail,
          mapLink: getMapLink(dayRest1.title, dayRest1.place_id),
        });
      }
      if (dayRest2 && dayRest2 !== dayRest1) {
        restaurants.push({
          id: id('rest', d, 1),
          name: dayRest2.title,
          note: dayRest2.description || 'Gợi ý cho bữa tối',
          rating: dayRest2.rating,
          reviews: dayRest2.reviews,
          thumbnail: dayRest2.thumbnail,
          mapLink: getMapLink(dayRest2.title, dayRest2.place_id),
        });
      }

      // Fallback nếu không có nhà hàng trong data
      if (restaurants.length === 0) {
        restaurants.push({
          id: id('rest', d, 0),
          name: vegetarian ? 'Nhà hàng chay địa phương' : `Đặc sản ${dest}`,
          note: 'Hương vị truyền thống',
        });
      }

      days.push({
        dayIndex: d,
        label: req.startDate ? formatDayLabel(req.startDate, d - 1) : `Ngày ${d}`,
        activities,
        restaurants,
      });
    }
  } else {
    // 2. FALLBACK: Dùng dữ liệu từ train_vietnam_tourism.json (Dữ liệu cũ)
    const items = await searchKnowledge(dest, req.preferences);

    if (items.length === 0) {
      // 3. FALLBACK CUỐI: Dùng mock generic
      for (let d = 1; d <= maxDays; d++) {
        const { activities, restaurants } = genericDay(d, dest, vegetarian, req.budgetTier);
        days.push({
          dayIndex: d,
          label: req.startDate ? formatDayLabel(req.startDate, d - 1) : `Ngày ${d}`,
          activities,
          restaurants,
        });
      }
    } else {
      // Phân bổ các item tìm được vào các ngày
      const itemsPerDay = Math.ceil(items.length / maxDays);

      for (let d = 1; d <= maxDays; d++) {
        const dayItems = items.slice((d - 1) * itemsPerDay, d * itemsPerDay).slice(0, 3);
        const activities: SuggestedActivity[] = dayItems.map((item, idx) => ({
          id: id('act', d, idx),
          title: item.title,
          description: item.paragraphs[0]?.context.substring(0, 150) + '...',
          estimatedDuration: '2-3h',
          suggestedStart: idx === 0 ? '08:30' : idx === 1 ? '14:00' : '19:00',
        }));

        if (activities.length < 2) {
          activities.push({
            id: id('act', d, activities.length),
            title: `Khám phá ẩm thực ${dest}`,
            description: 'Thưởng thức các món ăn địa phương đặc sắc.',
            estimatedDuration: '2h',
            suggestedStart: '18:30',
          });
        }

        const restaurants: SuggestedRestaurant[] = vegetarian
          ? [{ id: id('rest', d, 0), name: 'Nhà hàng chay địa phương', note: 'Thanh đạm và sạch sẽ' }]
          : [{ id: id('rest', d, 0), name: `Đặc sản ${dest}`, note: 'Hương vị truyền thống' }];

        days.push({
          dayIndex: d,
          label: req.startDate ? formatDayLabel(req.startDate, d - 1) : `Ngày ${d}`,
          activities,
          restaurants,
        });
      }
    }
  }

  const prefLine = req.preferences.length ? req.preferences.join(', ') : 'đa dạng';
  const budgetVi =
    req.budgetTier === 'low' ? 'tiết kiệm' : req.budgetTier === 'high' ? 'thoải mái' : 'vừa phải';

  return {
    summary: `Chào Hà! Mình đã thiết kế lịch trình ${req.dayCount} ngày tại ${dest} cho bạn. Ngân sách: ${budgetVi}, sở thích: ${prefLine}. Dữ liệu được lấy từ kho tri thức du lịch Việt Nam mới nhất.`,
    days,
    generatedAt: new Date().toISOString(),
  };
}


/**
 * Gọi backend AI nếu có EXPO_PUBLIC_AI_ITINERARY_URL; ngược lại dùng mock có cấu trúc giống contract API.
 */
export async function requestAiItinerary(req: AiItineraryRequest): Promise<AiItineraryResponse> {
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`AI itinerary HTTP ${res.status}`);
      const data = (await res.json()) as AiItineraryResponse;
      if (!data?.days?.length) throw new Error('Phản hồi AI không hợp lệ');
      return data;
    } catch {
      await delay(500 + Math.floor(Math.random() * 400));
      return buildResponseFromKnowledge(req);
    }
  }

  await delay(900 + Math.floor(Math.random() * 600));
  return buildResponseFromKnowledge(req);
}

export async function requestCityDataSuggestions(
  destination: string,
  category: 'tourism' | 'restaurant' | 'cafe',
  query?: string,
): Promise<LocalResult[]> {
  if (!API_BASE_URL) return [];

  const params = new URLSearchParams({ destination, category });
  if (query?.trim()) {
    params.set('query', query.trim());
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/ai/city-data?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as LocalResult[];
  return Array.isArray(data) ? data : [];
}
