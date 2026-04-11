/**
 * Dịch vụ tri thức du lịch Việt Nam — Tra cứu từ file JSON 6.5MB (UC-04 mở rộng)
 * và các bộ dữ liệu mới cho 8 thành phố (HaNoi, HCM, DaNang, HaGiang, NinhBinh, QuangNinh, ThanhHoa, NhaTrang).
 */

export interface TourismItem {
  title: string;
  paragraphs: {
    context: string;
    qas: {
      question: string;
      id: string;
      answers: { text: string; answer_start: number }[];
    }[];
  }[];
}

export interface KnowledgeBase {
  data: TourismItem[];
}

/** 
 * Giao diện cho dữ liệu SerpApi (google_local) mới
 */
export interface LocalResult {
  title: string;
  rating?: number;
  reviews?: number;
  description?: string;
  type?: string;
  address?: string;
  thumbnail?: string;
  place_id?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface CityData {
  search_parameters?: any;
  local_results: LocalResult[];
}

let cachedKB: KnowledgeBase | null = null;
let isLoading = false;

/**
 * Đăng ký các file JSON dữ liệu thành phố.
 * Trong Expo/React Native, require() phải là chuỗi hằng số (literal).
 */
const CITY_DATA_REGISTRY: Record<string, Record<string, CityData>> = {};

/**
 * Tải dữ liệu từ file JSON. Trong môi trường Expo, dùng require là nhanh nhất nếu file tĩnh.
 */
export async function loadKnowledgeBase(): Promise<KnowledgeBase> {
  if (cachedKB) return cachedKB;
  if (isLoading) {
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return cachedKB!;
  }

  isLoading = true;
  try {
    // Fallback an toàn khi bộ dữ liệu JSON chưa được đồng bộ vào frontend.
    cachedKB = { data: [] };
    return cachedKB;
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Map tên địa danh hiển thị sang key trong Registry
 */
function normalizeCityKey(city: string): string {
  const c = city.toLowerCase();
  if (c.includes('hà nội') || c === 'hanoi') return 'HaNoi';
  if (c.includes('hồ chí minh') || c.includes('sai gon') || c === 'hcm') return 'HCM';
  if (c.includes('đà nẵng') || c === 'danang') return 'DaNang';
  if (c.includes('hà giang') || c === 'hagiang') return 'HaGiang';
  if (c.includes('ninh bình') || c === 'ninhbinh') return 'NinhBinh';
  if (c.includes('quảng ninh') || c.includes('hạ long') || c === 'quangninh') return 'QuangNinh';
  if (c.includes('thanh hóa') || c === 'thanhhoa') return 'ThanhHoa';
  if (c.includes('nha trang') || c === 'nhatrang') return 'NhaTrang';
  return '';
}

/**
 * Tìm kiếm trong dữ liệu thành phố cụ thể
 */
export function searchCityData(
  city: string,
  category: 'tourism' | 'restaurant' | 'cafe',
  query: string = ''
): LocalResult[] {
  const cityKey = normalizeCityKey(city);
  if (!cityKey || !CITY_DATA_REGISTRY[cityKey]) return [];

  const data = CITY_DATA_REGISTRY[cityKey][category] as CityData;
  if (!data || !data.local_results) return [];

  if (!query) return data.local_results;

  const q = query.toLowerCase();
  return data.local_results.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q)
  );
}

/**
 * Tìm kiếm các chủ đề liên quan đến địa danh và sở thích.
 */
export async function searchKnowledge(
  destination: string,
  preferences: string[] = []
): Promise<TourismItem[]> {
  const kb = await loadKnowledgeBase();
  const destLower = destination.toLowerCase().trim();

  // 1. Lọc theo tiêu đề hoặc nội dung có chứa tên địa danh
  const matches = kb.data.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(destLower);
    const contentMatch = item.paragraphs.some((p) => p.context.toLowerCase().includes(destLower));
    return titleMatch || contentMatch;
  });

  // 2. Nếu có sở thích, ưu tiên các item có từ khóa sở thích trong context
  if (preferences.length > 0) {
    return matches.sort((a, b) => {
      const scoreA = preferences.filter(
        (p) => a.title.includes(p) || a.paragraphs.some((para) => para.context.includes(p))
      ).length;
      const scoreB = preferences.filter(
        (p) => b.title.includes(p) || b.paragraphs.some((para) => para.context.includes(p))
      ).length;
      return scoreB - scoreA;
    });
  }

  return matches;
}
