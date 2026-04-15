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
  ActivityLevel,
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

function resolveSerpApiKey(): string | undefined {
  const env =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SERPAPI_KEY
      ? String(process.env.EXPO_PUBLIC_SERPAPI_KEY).trim()
      : '';
  if (env) return env;

  const extra = (Constants.expoConfig?.extra as { serpApiKey?: string } | undefined)?.serpApiKey?.trim();
  if (extra) return extra;

  return undefined;
}

const SERPAPI_KEY = resolveSerpApiKey();
const SERPAPI_SEARCH_URL = 'https://serpapi.com/search.json';

function resolveLlmConfig(): { baseUrl: string; apiKey?: string; model: string } | null {
  const baseUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LLM_BASE_URL
      ? String(process.env.EXPO_PUBLIC_LLM_BASE_URL).trim()
      : '';
  const apiKey =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LLM_API_KEY
      ? String(process.env.EXPO_PUBLIC_LLM_API_KEY).trim()
      : '';
  const model =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LLM_MODEL
      ? String(process.env.EXPO_PUBLIC_LLM_MODEL).trim()
      : '';

  const extra = Constants.expoConfig?.extra as
    | { llmBaseUrl?: string; llmApiKey?: string; llmModel?: string }
    | undefined;

  const resolvedBaseUrl = baseUrl || extra?.llmBaseUrl?.trim() || '';
  const resolvedModel = model || extra?.llmModel?.trim() || 'gpt-4o-mini';
  const resolvedApiKey = apiKey || extra?.llmApiKey?.trim() || '';

  if (!resolvedBaseUrl && !resolvedApiKey) return null;

  return {
    baseUrl: resolvedBaseUrl || 'https://api.openai.com/v1',
    apiKey: resolvedApiKey || undefined,
    model: resolvedModel,
  };
}

const LLM_CONFIG = resolveLlmConfig();

type SerpApiLocalResult = LocalResult & {
  place_id?: string;
  serpapi_thumbnail?: string;
  hours?: string;
  price?: string;
  type?: string;
  title?: string;
  name?: string;
  address?: string;
};

type SerpApiResponse = {
  local_results?: SerpApiLocalResult[];
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function normalizeActivityLevel(level?: string): ActivityLevel {
  const value = (level ?? '').trim().toLowerCase();
  if (value === 'it' || value === 'few' || value === 'light') return 'it';
  if (value === 'nhieu' || value === 'many' || value === 'full') return 'vua';
  return 'vua';
}

function activityTargetCount(level?: string): number {
  const normalized = normalizeActivityLevel(level);
  if (normalized === 'it') return 3;
  return 5;
}

function activityLevelLabel(level?: string): string {
  const normalized = normalizeActivityLevel(level);
  if (normalized === 'it') return 'ít';
  return 'vừa';
}

function stripVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function isBeachPreference(pref: string): boolean {
  const n = stripVi(pref);
  return n.includes('beach') || n.includes('bien');
}

function adaptRequestForDestination(req: AiItineraryRequest): { adjusted: AiItineraryRequest; note?: string } {
  const destinationNorm = stripVi(req.destination);
  const isHanoi = destinationNorm.includes('ha noi') || destinationNorm.includes('hanoi');
  const hasBeachPref = req.preferences.some((p) => isBeachPreference(p));

  if (!isHanoi || !hasBeachPref) {
    return { adjusted: req };
  }

  const filteredPrefs = req.preferences.filter((p) => !isBeachPreference(p));
  const fallbackPrefs = filteredPrefs.length > 0 ? filteredPrefs : ['culture', 'food'];

  return {
    adjusted: {
      ...req,
      preferences: fallbackPrefs,
    },
    note:
      'Lưu ý: Hà Nội không có biển, nên mình đã ưu tiên lịch trình theo hướng hồ, phố cổ, văn hóa và ẩm thực để phù hợp thực tế.',
  };
}

function withSummaryNote(response: AiItineraryResponse, note?: string): AiItineraryResponse {
  if (!note) return response;
  return {
    ...response,
    summary: `${response.summary} ${note}`,
  };
}

function buildSerpApiQuery(destination: string, category: 'tourism' | 'restaurant' | 'cafe'): string {
  const cleanDestination = destination.trim();
  if (category === 'tourism') return `tourist attractions in ${cleanDestination}`;
  if (category === 'cafe') return `cafes in ${cleanDestination}`;
  return `restaurants in ${cleanDestination}`;
}

function buildSearchContextLine(category: 'tourism' | 'restaurant' | 'cafe', items: LocalResult[]): string {
  const label = category === 'tourism' ? 'Địa điểm tham quan' : category === 'cafe' ? 'Cafe' : 'Nhà hàng';
  if (items.length === 0) return `${label}: không có dữ liệu.`;

  return `${label}:\n${items
    .slice(0, 8)
    .map((item, index) => {
      const parts = [
        `${index + 1}. ${item.title}`,
        item.type ? `loại=${item.type}` : '',
        item.address ? `địa chỉ=${item.address}` : '',
        typeof item.rating === 'number' ? `rating=${item.rating}` : '',
        typeof item.reviews === 'number' ? `reviews=${item.reviews}` : '',
        item.description ? `mô tả=${item.description}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n')}`;
}

function extractJsonPayload(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ?? trimmed.match(/```\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

function normalizeDayLabel(req: AiItineraryRequest, dayIndex: number, rawLabel?: string): string {
  const fallback = req.startDate ? formatDayLabel(req.startDate, dayIndex - 1) : `Ngày ${dayIndex}`;
  const label = String(rawLabel ?? '').trim();
  return label || fallback;
}

function normalizeSuggestedActivity(dayIndex: number, index: number, item: Partial<SuggestedActivity> & Record<string, unknown>): SuggestedActivity {
  const title = String(item.title ?? item.name ?? `Hoạt động ${index + 1}`).trim();
  const estimatedDuration = String(item.estimatedDuration ?? item.duration ?? '2h').trim() || '2h';
  return {
    id: String(item.id ?? id('act', dayIndex, index)),
    title,
    description: String(item.description ?? item.note ?? '').trim() || undefined,
    estimatedDuration,
    suggestedStart: String(item.suggestedStart ?? item.startTime ?? '').trim() || undefined,
    address: String(item.address ?? '').trim() || undefined,
    type: String(item.type ?? '').trim() || undefined,
    hours: String(item.hours ?? '').trim() || undefined,
    priceRange: String(item.priceRange ?? '').trim() || undefined,
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviews: typeof item.reviews === 'number' ? item.reviews : undefined,
    thumbnail: String(item.thumbnail ?? '').trim() || undefined,
    mapLink: String(item.mapLink ?? '').trim() || undefined,
  };
}

function normalizeSuggestedRestaurant(dayIndex: number, index: number, item: Partial<SuggestedRestaurant> & Record<string, unknown>): SuggestedRestaurant {
  const name = String(item.name ?? item.title ?? `Nhà hàng ${index + 1}`).trim();
  return {
    id: String(item.id ?? id('rest', dayIndex, index)),
    name,
    note: String(item.note ?? '').trim() || undefined,
    description: String(item.description ?? '').trim() || undefined,
    address: String(item.address ?? '').trim() || undefined,
    type: String(item.type ?? '').trim() || undefined,
    hours: String(item.hours ?? '').trim() || undefined,
    priceRange: String(item.priceRange ?? '').trim() || undefined,
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviews: typeof item.reviews === 'number' ? item.reviews : undefined,
    thumbnail: String(item.thumbnail ?? '').trim() || undefined,
    mapLink: String(item.mapLink ?? '').trim() || undefined,
  };
}

function normalizeAiItineraryResponse(data: unknown, req: AiItineraryRequest): AiItineraryResponse | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const rawDays = Array.isArray(raw.days) ? raw.days : [];

  const days = rawDays
    .map((day, dayIndex) => {
      if (!day || typeof day !== 'object') return null;
      const d = day as Record<string, unknown>;
      const dayNumber = typeof d.dayIndex === 'number' ? d.dayIndex : dayIndex + 1;
      const activities = Array.isArray(d.activities)
        ? d.activities.map((item, index) => normalizeSuggestedActivity(dayNumber, index, item as Record<string, unknown>))
        : [];
      const restaurants = Array.isArray(d.restaurants)
        ? d.restaurants.map((item, index) => normalizeSuggestedRestaurant(dayNumber, index, item as Record<string, unknown>))
        : [];

      return {
        dayIndex: dayNumber,
        label: normalizeDayLabel(req, dayNumber, typeof d.label === 'string' ? d.label : undefined),
        activities: activities.length > 0 ? activities : [{
          id: id('act', dayNumber, 0),
          title: `Khám phá ${req.destination}`,
          description: 'Gợi ý dự phòng do LLM không trả đủ hoạt động.',
          estimatedDuration: '2h',
        }],
        restaurants: restaurants.length > 0 ? restaurants : [{
          id: id('rest', dayNumber, 0),
          name: `Đặc sản ${req.destination}`,
          note: 'Gợi ý dự phòng do LLM không trả đủ nhà hàng.',
        }],
      } satisfies SuggestedDay;
    })
    .filter((day): day is SuggestedDay => Boolean(day));

  if (days.length === 0) return null;

  return {
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    days,
    generatedAt: typeof raw.generatedAt === 'string' && raw.generatedAt.trim() ? raw.generatedAt : new Date().toISOString(),
  };
}

async function callOpenAiCompatibleChat(messages: ChatMessage[]): Promise<string | null> {
  if (!LLM_CONFIG) return null;

  const baseUrl = LLM_CONFIG.baseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (LLM_CONFIG.apiKey) {
    headers.Authorization = `Bearer ${LLM_CONFIG.apiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages,
        temperature: 0.4,
      }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}

function buildRagPrompt(req: AiItineraryRequest, tourism: LocalResult[], restaurants: LocalResult[], cafes: LocalResult[], knowledge: TourismItem[]): ChatMessage[] {
  const prefLine = req.preferences.length ? req.preferences.join(', ') : 'đa dạng';
  const budgetLine = req.budgetTier === 'low' ? 'tiết kiệm' : req.budgetTier === 'high' ? 'thoải mái' : 'vừa phải';
  const activityLine = activityLevelLabel(req.activityLevel);
  const knowledgeLine = knowledge.length
    ? knowledge.slice(0, 6).map((item, index) => `${index + 1}. ${item.title} — ${item.paragraphs[0]?.context.slice(0, 180) ?? ''}`).join('\n')
    : 'Không có mục tri thức cục bộ phù hợp.';

  return [
    {
      role: 'system',
      content:
        'Bạn là trợ lý du lịch tiếng Việt. Nhiệm vụ của bạn là tạo lịch trình ngắn gọn, thực tế, không bịa dữ liệu ngoài ngữ cảnh truy xuất. Trả về CHỈ JSON hợp lệ theo schema: {"summary": string, "days": [{"dayIndex": number, "label": string, "activities": [...], "restaurants": [...]}], "generatedAt": string}. Mỗi activity phải có title, description, estimatedDuration, suggestedStart nếu có; mỗi restaurant phải có name và note. Không thêm markdown.',
    },
    {
      role: 'user',
      content: `
Điểm đến: ${req.destination}
Số ngày: ${req.dayCount}
Ngân sách: ${budgetLine}
Mức hoạt động: ${activityLine}
Sở thích: ${prefLine}
Ngày bắt đầu: ${req.startDate ?? 'không có'}

Ngữ cảnh truy xuất từ SerpApi:
${buildSearchContextLine('tourism', tourism)}

${buildSearchContextLine('cafe', cafes)}

${buildSearchContextLine('restaurant', restaurants)}

Ngữ cảnh knowledge base:
${knowledgeLine}

Yêu cầu:
- Ưu tiên địa điểm thực tế trong ngữ cảnh trên.
- Mỗi ngày cần số hoạt động theo mức: ít = 3, vừa = 5.
- Ưu tiên phân bổ hoạt động theo nhịp sáng / trưa / chiều / tối sao cho tự nhiên.
- Nếu có quán cafe phù hợp thì dùng cho bữa nghỉ/chill.
- Nếu thiếu dữ liệu, vẫn tạo lịch trình hợp lý nhưng không bịa địa chỉ cụ thể.
- Viết tiếng Việt tự nhiên, rõ ràng, phù hợp người dùng phổ thông.
`.trim(),
    },
  ];
}

async function buildResponseFromLlm(req: AiItineraryRequest): Promise<AiItineraryResponse | null> {
  if (!LLM_CONFIG) return null;

  const dest = req.destination.trim();
  const [tourism, restaurants, cafes, knowledge] = await Promise.all([
    fetchSerpApiLocalResults(dest, 'tourism'),
    fetchSerpApiLocalResults(dest, 'restaurant'),
    fetchSerpApiLocalResults(dest, 'cafe'),
    searchKnowledge(dest, req.preferences),
  ]);

  const content = await callOpenAiCompatibleChat(buildRagPrompt(req, tourism, restaurants, cafes, knowledge));
  if (!content) return null;

  const jsonText = extractJsonPayload(content);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return normalizeAiItineraryResponse(parsed, req);
  } catch {
    return null;
  }
}

function normalizeSerpApiResult(item: SerpApiLocalResult, fallbackTitle: string): LocalResult {
  const title = String(item.title ?? item.name ?? fallbackTitle).trim() || fallbackTitle;
  return {
    title,
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviews: typeof item.reviews === 'number' ? item.reviews : undefined,
    description: item.description ?? item.type ?? undefined,
    type: item.type ?? undefined,
    address: item.address ?? undefined,
    thumbnail: item.thumbnail ?? item.serpapi_thumbnail ?? undefined,
    place_id: item.place_id ?? undefined,
    gps_coordinates: item.gps_coordinates ?? undefined,
  };
}

async function fetchSerpApiLocalResults(
  destination: string,
  category: 'tourism' | 'restaurant' | 'cafe',
  query?: string,
): Promise<LocalResult[]> {
  if (!SERPAPI_KEY) return [];

  const searchParams = new URLSearchParams({
    engine: 'google_maps',
    q: query?.trim() || buildSerpApiQuery(destination, category),
    hl: 'vi',
    gl: 'vn',
    api_key: SERPAPI_KEY,
  });

  try {
    const response = await fetch(`${SERPAPI_SEARCH_URL}?${searchParams.toString()}`);
    if (!response.ok) return [];

    const payload = (await response.json()) as SerpApiResponse;
    const items = Array.isArray(payload.local_results) ? payload.local_results : [];
    return items
      .map((item) => normalizeSerpApiResult(item, destination))
      .filter((item) => Boolean(item.title?.trim()));
  } catch {
    return [];
  }
}

function placeTypeLabel(category: 'tourism' | 'restaurant' | 'cafe', place: LocalResult): string {
  if (place.type?.trim()) return place.type.trim();
  if (category === 'tourism') return 'Điểm tham quan';
  if (category === 'cafe') return 'Quán cafe';
  return 'Nhà hàng';
}

function toSuggestedActivity(dayIndex: number, index: number, place: LocalResult, destination: string): SuggestedActivity {
  return {
    id: id('act', dayIndex, index),
    title: place.title,
    description: place.description || `${placeTypeLabel('tourism', place)} tại ${destination}`,
    estimatedDuration: index === 0 ? '2–3h' : index === 1 ? '1.5–2h' : '1–2h',
    suggestedStart: index === 0 ? '08:30' : index === 1 ? '10:30' : index === 2 ? '14:30' : '16:30',
    address: place.address,
    type: place.type,
    rating: place.rating,
    reviews: place.reviews,
    thumbnail: place.thumbnail,
    mapLink: getMapLink(place.title, place.place_id),
  };
}

function toSuggestedRestaurant(
  dayIndex: number,
  index: number,
  place: LocalResult,
  category: 'restaurant' | 'cafe',
): SuggestedRestaurant {
  const label = placeTypeLabel(category, place);
  return {
    id: id('rest', dayIndex, index),
    name: place.title,
    note: place.description || label,
    description: place.description,
    address: place.address,
    type: label,
    hours: undefined,
    priceRange: undefined,
    rating: place.rating,
    reviews: place.reviews,
    thumbnail: place.thumbnail,
    mapLink: getMapLink(place.title, place.place_id),
  };
}

function toSuggestedPlaceActivity(
  dayIndex: number,
  index: number,
  place: LocalResult,
  category: 'tourism' | 'restaurant' | 'cafe',
  destination: string,
): SuggestedActivity {
  const label = placeTypeLabel(category, place);
  const duration = category === 'tourism' ? '1.5–2.5h' : category === 'cafe' ? '45m–1.5h' : '1–2h';
  const startTime = category === 'tourism' ? (index === 0 ? '08:30' : '14:00') : category === 'cafe' ? '10:30' : '18:30';

  return {
    id: id('act', dayIndex, index),
    title: place.title,
    description: place.description || `${label} tại ${destination}`,
    estimatedDuration: duration,
    suggestedStart: startTime,
    address: place.address,
    type: place.type ?? label,
    rating: place.rating,
    reviews: place.reviews,
    thumbnail: place.thumbnail,
    mapLink: getMapLink(place.title, place.place_id),
  };
}

function chooseByIndex<T>(items: T[], index: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[index % items.length];
}

function localResultScoreByPreferences(item: LocalResult, preferences: string[]): number {
  if (!preferences.length) return 0;

  const text = stripVi(`${item.title ?? ''} ${item.type ?? ''} ${item.description ?? ''} ${item.address ?? ''}`);
  let score = 0;

  for (const pref of preferences) {
    const p = stripVi(pref);
    if (p === 'beach' || p === 'bien') {
      if (/(bien|beach|cat|vinh|dao|hai dang|sam son|hai tien|hai hoa|hai thanh)/.test(text)) score += 10;
      continue;
    }
    if (p === 'culture' || p === 'van hoa') {
      if (/(bao tang|museum|di tich|chua|dinh|den|nha tho|lich su|heritage)/.test(text)) score += 10;
      continue;
    }
    if (p === 'adventure' || p === 'mao hiem') {
      if (/(dinh|nui|rung|thac|trekking|leo nui|cap treo|dong)/.test(text)) score += 10;
      continue;
    }
    if (p === 'family' || p === 'gia dinh') {
      if (/(cong vien|park|thieu nhi|vui choi|giai tri|so thu|sun world)/.test(text)) score += 10;
      continue;
    }
    if (p === 'food' || p === 'am thuc') {
      if (/(cho dem|am thuc|an uong|dac san|street food|nha hang)/.test(text)) score += 10;
      continue;
    }
    if (p === 'chay') {
      if (/(chay|vegan|vegetarian|thanh tinh)/.test(text)) score += 10;
    }
  }

  return score;
}

function sortLocalResultsByPreferences(items: LocalResult[], preferences: string[]): LocalResult[] {
  if (items.length <= 1) return [...items];
  if (!preferences.length) return shuffle(items);

  return [...items].sort((a, b) => {
    const scoreA = localResultScoreByPreferences(a, preferences);
    const scoreB = localResultScoreByPreferences(b, preferences);
    if (scoreA !== scoreB) return scoreB - scoreA;

    const ratingA = typeof a.rating === 'number' ? a.rating : 0;
    const ratingB = typeof b.rating === 'number' ? b.rating : 0;
    return ratingB - ratingA;
  });
}

function hasPreference(preferences: string[], name: 'beach' | 'food' | 'culture' | 'adventure' | 'family' | 'chay'): boolean {
  return preferences.some((pref) => {
    const normalized = stripVi(pref);
    if (name === 'beach') return normalized === 'beach' || normalized === 'bien';
    if (name === 'food') return normalized === 'food' || normalized === 'am thuc';
    if (name === 'culture') return normalized === 'culture' || normalized === 'van hoa';
    if (name === 'adventure') return normalized === 'adventure' || normalized === 'mao hiem';
    if (name === 'family') return normalized === 'family' || normalized === 'gia dinh';
    return normalized === 'chay';
  });
}

function findBeachCandidate(items: LocalResult[]): LocalResult | undefined {
  return items.find((item) =>
    /biển|beach|cát|vịnh|đảo|hải đăng|sầm sơn|sam son|hải tiến|hai tien|hải hòa|hai hoa|hải thanh|hai thanh/i.test(
      stripVi(`${item.title ?? ''} ${item.type ?? ''} ${item.description ?? ''} ${item.address ?? ''}`),
    ),
  );
}

function findFoodCandidate(items: LocalResult[]): LocalResult | undefined {
  return items.find((item) =>
    /chợ đêm|ẩm thực|ăn uống|đặc sản|street food|nhà hàng|quán ăn|buffet|cafe|cà phê/i.test(
      stripVi(`${item.title ?? ''} ${item.type ?? ''} ${item.description ?? ''} ${item.address ?? ''}`),
    ),
  );
}

function buildOrderedActivitiesFromPlaces(
  dayIndex: number,
  destination: string,
  places: Array<{ place: LocalResult; category: 'tourism' | 'restaurant' | 'cafe' }>,
  level: string | undefined,
): SuggestedActivity[] {
  const targetCount = Math.min(activityTargetCount(level), 5);
  const activities: SuggestedActivity[] = [];

  for (const [index, entry] of places.entries()) {
    if (activities.length >= targetCount) break;
    activities.push(toSuggestedPlaceActivity(dayIndex, index, entry.place, entry.category, destination));
  }

  while (activities.length < targetCount) {
    const index = activities.length;
    activities.push({
      id: id('act', dayIndex, index),
      title: `Khám phá ${destination}`,
      description: `Bổ sung hoạt động theo mức ${activityLevelLabel(level)}.`,
      estimatedDuration: index === 0 ? '2–3h' : index === 1 ? '1.5–2h' : '1–2h',
      suggestedStart: index === 0 ? '08:30' : index === 1 ? '10:30' : index === 2 ? '14:30' : index === 3 ? '16:30' : index === 4 ? '18:30' : index === 5 ? '20:00' : '21:15',
    });
  }

  return activities;
}

function buildDailyResults(
  req: AiItineraryRequest,
  tourism: LocalResult[],
  restaurants: LocalResult[],
  cafes: LocalResult[],
): AiItineraryResponse {
  const dest = req.destination.trim();
  const vegetarian = req.preferences.some((p) => /chay|vegetarian|vegan/i.test(p));
  const maxDays = Math.min(req.dayCount, 14);
  const activityTarget = activityTargetCount(req.activityLevel);
  const wantsBeach = hasPreference(req.preferences, 'beach');
  const wantsFood = hasPreference(req.preferences, 'food');
  const tourismPool = sortLocalResultsByPreferences(tourism, req.preferences);
  const cafePool = sortLocalResultsByPreferences(cafes, req.preferences);
  const foodPool = sortLocalResultsByPreferences(
    vegetarian ? [...cafes, ...restaurants] : [...restaurants, ...cafes],
    req.preferences,
  );
  const fallbackBudget = req.budgetTier === 'low' ? 'tiết kiệm' : req.budgetTier === 'high' ? 'thoải mái' : 'vừa phải';

  const days: SuggestedDay[] = [];
  for (let d = 1; d <= maxDays; d++) {
    const beachCandidate = wantsBeach ? findBeachCandidate(tourismPool) : undefined;
    const foodCandidate = wantsFood ? findFoodCandidate(foodPool) ?? chooseByIndex(foodPool, d - 1) ?? chooseByIndex(cafePool, d - 1) : undefined;
    const firstTour = tourismPool[(d - 1) * 3];
    const secondTour = tourismPool[(d - 1) * 3 + 1];
    const thirdTour = tourismPool[(d - 1) * 3 + 2];
    const morningFood = chooseByIndex(cafePool, d - 1) ?? chooseByIndex(foodPool, d - 1);
    const middayFood = chooseByIndex(foodPool, d - 1);
    const eveningFood = chooseByIndex(foodPool, d);
    const extraFoodFocus = wantsFood ? chooseByIndex(foodPool, d + 1) ?? chooseByIndex(cafePool, d) : undefined;

    const activitySequence: Array<{ place: LocalResult; category: 'tourism' | 'restaurant' | 'cafe' }> = [];
    if (firstTour) activitySequence.push({ place: firstTour, category: 'tourism' });
    if (activitySequence.length < activityTarget && morningFood) {
      activitySequence.push({
        place: morningFood,
        category: cafes.includes(morningFood) ? 'cafe' : 'restaurant',
      });
    }
    if (activitySequence.length < activityTarget && secondTour) activitySequence.push({ place: secondTour, category: 'tourism' });
    if (activitySequence.length < activityTarget && middayFood) {
      activitySequence.push({
        place: middayFood,
        category: cafes.includes(middayFood) ? 'cafe' : 'restaurant',
      });
    }
    if (activitySequence.length < activityTarget && thirdTour) activitySequence.push({ place: thirdTour, category: 'tourism' });
    if (activitySequence.length < activityTarget && eveningFood) {
      activitySequence.push({
        place: eveningFood,
        category: cafes.includes(eveningFood) ? 'cafe' : 'restaurant',
      });
    }

    if (d === 1 && beachCandidate) {
      const existingBeachIndex = activitySequence.findIndex((entry) => entry.place === beachCandidate);
      if (existingBeachIndex >= 0) {
        activitySequence.splice(existingBeachIndex, 1);
      }
      activitySequence.unshift({ place: beachCandidate, category: 'tourism' });
    }

    if (wantsFood && foodCandidate) {
      const existingFoodIndex = activitySequence.findIndex((entry) => entry.place === foodCandidate);
      if (existingFoodIndex >= 0) {
        activitySequence.splice(existingFoodIndex, 1);
      }
      const insertIndex = d === 1 && beachCandidate ? 1 : 0;
      activitySequence.splice(Math.min(insertIndex, activitySequence.length), 0, {
        place: foodCandidate,
        category: cafes.includes(foodCandidate) ? 'cafe' : 'restaurant',
      });
    }

    const activities = buildOrderedActivitiesFromPlaces(d, dest, activitySequence, req.activityLevel);

    const mappedFoodSource = eveningFood ?? chooseByIndex(foodPool, d - 1);
    const mappedFood = mappedFoodSource ? [mappedFoodSource].map((place, idx) => {
      const category = cafes.includes(place) ? 'cafe' : 'restaurant';
      return toSuggestedRestaurant(d, idx, place, category);
    }) : [];

    if (activities.length === 0) {
      activities.push({
        id: id('act', d, 0),
        title: `Khám phá ${dest}`,
        description: `Buổi sáng: dạo quanh trung tâm, ưu tiên ${fallbackBudget}.`,
        estimatedDuration: '2–3h',
        suggestedStart: '09:00',
      });
    }

    if (mappedFood.length === 0) {
      mappedFood.push(
        vegetarian
          ? {
              id: id('rest', d, 0),
              name: 'Quán chay địa phương',
              note: 'Hỏi khu vực trung tâm hoặc gần khách sạn',
            }
          : {
              id: id('rest', d, 0),
              name: `Đặc sản ${dest}`,
              note: 'Ưu tiên quán có đánh giá tốt trên bản đồ',
            },
      );
    }

    days.push({
      dayIndex: d,
      label: req.startDate ? formatDayLabel(req.startDate, d - 1) : `Ngày ${d}`,
      activities,
      restaurants: mappedFood,
    });
  }

  const prefLine = req.preferences.length ? req.preferences.join(', ') : 'đa dạng';
  const budgetVi = req.budgetTier === 'low' ? 'tiết kiệm' : req.budgetTier === 'high' ? 'thoải mái' : 'vừa phải';

  return {
    summary: `Chào bạn! Mình đã tổng hợp gợi ý ${req.dayCount} ngày tại ${dest} từ SerpApi. Ngân sách: ${budgetVi}, sở thích: ${prefLine}.`,
    days,
    generatedAt: new Date().toISOString(),
  };
}

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
  activityCount: number = 3,
): { activities: SuggestedActivity[]; restaurants: SuggestedRestaurant[] } {
  const budgetHint =
    budget === 'low' ? 'ưu tiên điểm miễn phí / giá mềm' : budget === 'high' ? 'có thể thêm tour riêng' : 'cân bằng chi phí';
  const templates: Array<{ title: string; description: string; estimatedDuration: string; suggestedStart: string }> = [
    {
      title: `Tham quan trung tâm ${destination}`,
      description: `Buổi sáng: đi bộ khu trung tâm, ${budgetHint}.`,
      estimatedDuration: '2–3h',
      suggestedStart: '09:00',
    },
    {
      title: `Điểm nổi bật địa phương`,
      description: 'Khám phá cảnh quan, bảo tàng hoặc công viên.',
      estimatedDuration: '1.5–2h',
      suggestedStart: '10:30',
    },
    {
      title: 'Ăn trưa và nghỉ ngơi',
      description: 'Thử món đặc sản, nghỉ nhẹ trước buổi chiều.',
      estimatedDuration: '1.5h',
      suggestedStart: '12:00',
    },
    {
      title: 'Hoạt động buổi chiều',
      description: 'Dạo phố, check-in hoặc ghé điểm vui chơi gần đó.',
      estimatedDuration: '2h',
      suggestedStart: '14:30',
    },
    {
      title: 'Cafe / thư giãn',
      description: 'Nghỉ chân và tận hưởng không khí địa phương.',
      estimatedDuration: '1h',
      suggestedStart: '16:30',
    },
    {
      title: 'Bữa tối và dạo phố',
      description: 'Ăn tối, đi bộ buổi tối, xem phố đêm.',
      estimatedDuration: '1.5h',
      suggestedStart: '18:30',
    },
    {
      title: 'Hoạt động nhẹ buổi tối',
      description: 'Tùy năng lượng, có thể thêm chợ đêm hoặc ngắm cảnh đêm.',
      estimatedDuration: '1h',
      suggestedStart: '20:00',
    },
  ];
  return {
    activities: templates.slice(0, Math.min(activityCount, templates.length)).map((item, index) => ({
      id: id('act', dayIndex, index),
      title: item.title,
      description: item.description,
      estimatedDuration: item.estimatedDuration,
      suggestedStart: item.suggestedStart,
    })),
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
 * Tạo phản hồi từ dữ liệu nội bộ khi không có SerpApi hoặc cần fallback cục bộ.
 */
async function buildResponseFromKnowledge(req: AiItineraryRequest): Promise<AiItineraryResponse> {
  const dest = req.destination.trim();
  const vegetarian = req.preferences.some((p) => /chay|vegetarian|vegan/i.test(p));
  const maxDays = Math.min(req.dayCount, 14);
  const activityTarget = activityTargetCount(req.activityLevel);

  // 1. Thử lấy dữ liệu từ các bộ Dataset thành phố mới (8 thành phố)
  const cityTourism = searchCityData(dest, 'tourism');
  const cityRestaurants = searchCityData(dest, 'restaurant');
  const cityCafes = searchCityData(dest, 'cafe');

  const days: SuggestedDay[] = [];

  if (cityTourism.length > 0 || cityRestaurants.length > 0 || cityCafes.length > 0) {
    // SỬ DỤNG DỮ LIỆU THÀNH PHỐ MỚI (ưu tiên theo sở thích để tránh bỏ sót điểm phù hợp như Sầm Sơn khi chọn đi biển)
    const prioritizedTourism = sortLocalResultsByPreferences(cityTourism, req.preferences);
    const prioritizedRestaurants = sortLocalResultsByPreferences(cityRestaurants, req.preferences);
    const prioritizedCafes = sortLocalResultsByPreferences(cityCafes, req.preferences);
    const prioritizedFood = sortLocalResultsByPreferences([...cityRestaurants, ...cityCafes], req.preferences);

    for (let d = 1; d <= maxDays; d++) {
      const firstTour = prioritizedTourism[(d - 1) * 2];
      const secondTour = prioritizedTourism[(d - 1) * 2 + 1];
      const dayCafe = chooseByIndex(prioritizedCafes, d - 1) ?? chooseByIndex(prioritizedFood, d - 1);
      const dayRest1 = chooseByIndex(prioritizedRestaurants, d - 1) ?? chooseByIndex(prioritizedFood, d - 1);

      const activities: SuggestedActivity[] = [];
      if (firstTour) {
        activities.push(toSuggestedPlaceActivity(d, activities.length, firstTour, 'tourism', dest));
      }
      if (dayCafe) {
        activities.push(
          toSuggestedPlaceActivity(
            d,
            activities.length,
            dayCafe,
            cafes.includes(dayCafe) ? 'cafe' : 'restaurant',
            dest,
          ),
        );
      }
      if (secondTour) {
        activities.push(toSuggestedPlaceActivity(d, activities.length, secondTour, 'tourism', dest));
      }

      // Gợi ý nhà hàng / quán cafe xen kẽ theo ngày
      const dayRest2 = chooseByIndex(prioritizedFood, d);

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
        const { activities, restaurants } = genericDay(d, dest, vegetarian, req.budgetTier, activityTarget);
        days.push({
          dayIndex: d,
          label: req.startDate ? formatDayLabel(req.startDate, d - 1) : `Ngày ${d}`,
          activities,
          restaurants,
        });
      }
    } else {
      // Phân bổ các item tìm được vào các ngày theo kiểu xen kẽ địa điểm / cafe / nhà hàng
      const itemsPerDay = Math.ceil(items.length / maxDays);

      for (let d = 1; d <= maxDays; d++) {
        const dayItems = items.slice((d - 1) * itemsPerDay, d * itemsPerDay);
        const activities: SuggestedActivity[] = dayItems.slice(0, activityTarget).map((item, idx) => ({
          id: id('act', d, idx),
          title: item.title,
          description: item.paragraphs[0]?.context.substring(0, 150) + '...',
          estimatedDuration: idx === 0 ? '2-3h' : idx === 1 ? '45m-1.5h' : '1.5-2h',
          suggestedStart: idx === 0 ? '08:30' : idx === 1 ? '10:30' : idx === 2 ? '14:30' : idx === 3 ? '16:30' : idx === 4 ? '18:30' : idx === 5 ? '20:00' : '21:15',
        }));

        while (activities.length < activityTarget) {
          activities.push({
            id: id('act', d, activities.length),
            title: `Khám phá ${dest}`,
            description: `Bổ sung hoạt động theo mức ${activityLevelLabel(req.activityLevel)}.`,
            estimatedDuration: '1.5-2h',
            suggestedStart: activities.length === 0 ? '09:00' : activities.length === 1 ? '11:00' : activities.length === 2 ? '14:00' : activities.length === 3 ? '16:00' : '18:30',
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
    summary: `Chào bạn! Mình đã thiết kế lịch trình ${req.dayCount} ngày tại ${dest} cho bạn. Ngân sách: ${budgetVi}, sở thích: ${prefLine}, mức hoạt động: ${activityLevelLabel(req.activityLevel)}. Dữ liệu được lấy từ kho tri thức du lịch Việt Nam mới nhất.`,
    days,
    generatedAt: new Date().toISOString(),
  };
}

async function buildResponseFromSerpApi(req: AiItineraryRequest): Promise<AiItineraryResponse> {
  const dest = req.destination.trim();
  const [tourism, restaurants, cafes] = await Promise.all([
    fetchSerpApiLocalResults(dest, 'tourism'),
    fetchSerpApiLocalResults(dest, 'restaurant'),
    fetchSerpApiLocalResults(dest, 'cafe'),
  ]);

  if (tourism.length === 0 && restaurants.length === 0 && cafes.length === 0) {
    return buildResponseFromKnowledge(req);
  }

  return buildDailyResults(req, tourism, restaurants, cafes);
}


/**
 * Gọi backend AI nếu có EXPO_PUBLIC_AI_ITINERARY_URL; ngược lại dùng mock có cấu trúc giống contract API.
 */
export async function requestAiItinerary(req: AiItineraryRequest): Promise<AiItineraryResponse> {
  const { adjusted, note } = adaptRequestForDestination(req);

  const llmResponse = await buildResponseFromLlm(adjusted);
  if (llmResponse) return withSummaryNote(llmResponse, note);

  if (SERPAPI_KEY) {
    try {
      const serpResponse = await buildResponseFromSerpApi(adjusted);
      return withSummaryNote(serpResponse, note);
    } catch {
      // Tiếp tục fallback bên dưới.
    }
  }

  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjusted),
      });
      if (!res.ok) throw new Error(`AI itinerary HTTP ${res.status}`);
      const data = (await res.json()) as AiItineraryResponse;
      if (!data?.days?.length) throw new Error('Phản hồi AI không hợp lệ');
      return withSummaryNote(data, note);
    } catch {
      await delay(500 + Math.floor(Math.random() * 400));
      const kbResponse = await buildResponseFromKnowledge(adjusted);
      return withSummaryNote(kbResponse, note);
    }
  }

  await delay(900 + Math.floor(Math.random() * 600));
  const kbResponse = await buildResponseFromKnowledge(adjusted);
  return withSummaryNote(kbResponse, note);
}

export async function requestCityDataSuggestions(
  destination: string,
  category: 'tourism' | 'restaurant' | 'cafe',
  query?: string,
): Promise<LocalResult[]> {
  if (SERPAPI_KEY) {
    const serpResults = await fetchSerpApiLocalResults(destination, category, query);
    if (serpResults.length > 0) return serpResults;
  }

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

export interface AiChatRequest {
  message: string;
  sessionId?: number;
  userId?: number;
}

export interface AiChatResponse {
  reply: string;
  sessionId: number;
}

/**
 * Gọi API Chat tự do (Gemini + RAG) từ Backend.
 */
export async function requestAiChat(req: AiChatRequest): Promise<AiChatResponse> {
  if (!API_BASE_URL) {
    throw new Error('Chưa cấu hình API_BASE_URL');
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`AI chat HTTP ${res.status}`);
  }

  return (await res.json()) as AiChatResponse;
}
