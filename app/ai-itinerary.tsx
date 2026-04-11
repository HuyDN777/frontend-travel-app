import Ionicons from '@expo/vector-icons/Ionicons';
/**
 * UC-04 dạng chatbot: hội thoại thu tham số → gọi AI → duyệt / sửa → DayPlan draft.
 */
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestAiItinerary, requestCityDataSuggestions } from '@/services/aiItineraryService';
import { searchCityData } from '@/services/knowledgeService';
import { applyDayPlansToDraft } from '@/stores/planDraftStore';
import type {
  AiItineraryResponse,
  BudgetTier,
  DayPlan,
  SuggestedActivity,
  SuggestedDay,
} from '@/types/aiItinerary';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type CollectStep =
  | 'destination'
  | 'days'
  | 'preferences'
  | 'budget'
  | 'startDate'
  | 'confirm'
  | 'idle';

const PREFERENCE_OPTIONS = [
  { id: 'adventure', label: 'Mạo hiểm' },
  { id: 'culture', label: 'Văn hóa' },
  { id: 'beach', label: 'Biển' },
  { id: 'food', label: 'Ẩm thực' },
  { id: 'family', label: 'Gia đình' },
];

const BUDGET_OPTIONS: { tier: BudgetTier; label: string }[] = [
  { tier: 'low', label: 'Tiết kiệm' },
  { tier: 'medium', label: 'Vừa phải' },
  { tier: 'high', label: 'Thoải mái' },
];

let msgId = 0;
function nextId() {
  msgId += 1;
  return `m-${msgId}`;
}

/** Bỏ dấu + chữ thường để so khớp địa danh trong câu nói tự nhiên. */
function stripVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/** Điểm đến phổ biến — ưu tiên khớp chuỗi con trong tin nhắn. */
const KNOWN_PLACES: { canon: string; needles: string[] }[] = [
  { canon: 'Hà Nội', needles: ['ha noi', 'hanoi'] },
  { canon: 'TP.HCM', needles: ['ho chi minh', 'sai gon', 'saigon', 'tphcm', 'tp hcm', 'tp. hcm', 'hcm'] },
  { canon: 'Đà Nẵng', needles: ['da nang', 'danang'] },
  { canon: 'Nha Trang', needles: ['nha trang', 'nhatrang'] },
  { canon: 'Đà Lạt', needles: ['da lat', 'dalat'] },
  { canon: 'Huế', needles: ['hue', 'thua thien hue'] },
  { canon: 'Phú Quốc', needles: ['phu quoc', 'phuquoc'] },
  { canon: 'Ninh Bình', needles: ['ninh binh', 'ninhbinh'] },
  { canon: 'Hạ Long', needles: ['ha long', 'halong', 'quang ninh', 'quangninh'] },
  { canon: 'Thanh Hóa', needles: ['thanh hoa', 'thanhhoa'] },
  { canon: 'Cao Bằng', needles: ['cao bang', 'caobang'] },
  { canon: 'Hà Giang', needles: ['ha giang', 'hagiang'] },
];

const SUPPORTED_CITIES_CANON = KNOWN_PLACES.map(p => p.canon);

/** Fallback images for different activity categories and cities */
const FALLBACK_IMAGES = {
  tourism: {
    'Nha Trang': 'https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=800&auto=format&fit=crop', // Beach
    'Đà Lạt': 'https://images.unsplash.com/photo-1585226162383-75b2df5a3cbe?q=80&w=800&auto=format&fit=crop', // Pine forest
    'Đà Nẵng': 'https://images.unsplash.com/photo-1559592490-3498305c6d32?q=80&w=800&auto=format&fit=crop', // Dragon Bridge/Sea
    'Hà Nội': 'https://images.unsplash.com/photo-1509030450996-93f2e3d54238?q=80&w=800&auto=format&fit=crop', // Lake
    'TP.HCM': 'https://images.unsplash.com/photo-1618331812919-62034443bcad?q=80&w=800&auto=format&fit=crop', // City skyline
    'Huế': 'https://images.unsplash.com/photo-1585232924339-653974447477?q=80&w=800&auto=format&fit=crop', // Citadel
    'Phú Quốc': 'https://images.unsplash.com/photo-1589782182703-2aad69bc430c?q=80&w=800&auto=format&fit=crop', // Sunset beach
    'Ninh Bình': 'https://images.unsplash.com/photo-1629815049386-81977708db8c?q=80&w=800&auto=format&fit=crop', // Trang An
    'Hạ Long': 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=800&auto=format&fit=crop', // Ha Long Bay
    default: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop',
  },
  categories: {
    beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    temple: 'https://images.unsplash.com/photo-1566411135438-5f72cfbd8ef1?q=80&w=800&auto=format&fit=crop',
    museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?q=80&w=800&auto=format&fit=crop',
    park: 'https://images.unsplash.com/photo-1585938389612-a552a28d6914?q=80&w=800&auto=format&fit=crop',
    market: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop',
  },
  restaurant: 'https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=800&auto=format&fit=crop',
  cafe: 'https://images.unsplash.com/photo-1507133750040-4a8f5700e53f?q=80&w=800&auto=format&fit=crop',
};

function getFallbackImage(isRestaurant: boolean, isCafe: boolean, city?: string, type?: string, title?: string): string {
  if (isRestaurant) return FALLBACK_IMAGES.restaurant;
  if (isCafe) return FALLBACK_IMAGES.cafe;
  
  const text = ((title || '') + ' ' + (type || '')).toLowerCase();
  if (text.includes('biển') || text.includes('đảo') || text.includes('beach')) return FALLBACK_IMAGES.categories.beach;
  if (text.includes('chùa') || text.includes('tháp') || text.includes('đền') || text.includes('temple')) return FALLBACK_IMAGES.categories.temple;
  if (text.includes('bảo tàng') || text.includes('museum')) return FALLBACK_IMAGES.categories.museum;
  if (text.includes('chợ') || text.includes('market')) return FALLBACK_IMAGES.categories.market;
  if (text.includes('công viên') || text.includes('park')) return FALLBACK_IMAGES.categories.park;

  if (city && FALLBACK_IMAGES.tourism[city as keyof typeof FALLBACK_IMAGES.tourism]) {
    return (FALLBACK_IMAGES.tourism as any)[city];
  }
  return FALLBACK_IMAGES.tourism.default;
}

const KNOWN_PLACES_EXT = [...KNOWN_PLACES];

/**
 * Lấy tên địa điểm từ câu kiểu "tôi muốn đi Đà Nẵng nhé" thay vì lặp nguyên câu trong phản hồi bot.
 */
function extractDestination(raw: string): string {
  const t = raw.trim();
  if (!t) return '';

  const n = stripVi(t);

  for (const { canon, needles } of KNOWN_PLACES_EXT) {
    for (const needle of needles) {
      if (n.includes(needle)) return canon;
    }
  }

  let rest = t
    .replace(/^tôi\s+muốn\s+(đi|đến|tới)\s+/iu, '')
    .replace(/^mình\s+muốn\s+(đi|đến|tới)\s+/iu, '')
    .replace(/^mình\s+(đi|đến|tới)\s+/iu, '')
    .replace(/^tôi\s+(đi|đến|tới)\s+/iu, '')
    .replace(/^muốn\s+(đi|đến|tới)\s+/iu, '')
    .replace(/^(đi|đến|tới)\s+/iu, '')
    .replace(/\s*(nhé|nha|ạ|nhỉ|đi|!|。)*$/iu, '')
    .trim();

  for (const { canon, needles } of KNOWN_PLACES) {
    for (const needle of needles) {
      if (stripVi(rest).includes(needle)) return canon;
    }
  }

  return rest || t;
}

function extractBudgetTier(text: string): BudgetTier | null {
  const n = stripVi(text);
  if (/re|tiet kiem|binh dan|via he|ngon bo re/.test(n)) return 'low';
  if (/sang|luxury|cao cap|dang cap|thoai mai|xin|quy toc/.test(n)) return 'high';
  if (/vua phai|vua tam|trung binh/.test(n)) return 'medium';
  return null;
}

function extractDayCount(text: string): number | null {
  const n = stripVi(text);
  const match = n.match(/(\d{1,2})\s*(ngay|day)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return (num >= 1 && num <= 14) ? num : null;
  }
  return null;
}

function extractPrefsTags(text: string): string[] {
  const n = stripVi(text);
  const found: string[] = [];
  if (/bien|dao|cat|vinh|beach/.test(n)) found.push('beach');
  if (/an|ngon|am thuc|food|dac san|buffet|nha hang|quan an/.test(n)) found.push('food');
  if (/chua|van hoa|lich su|co|bao tang|dinh|den|heritage/.test(n)) found.push('culture');
  if (/leo|nui|rung|mao hiem|trekking|adventure|thac|dong/.test(n)) found.push('adventure');
  if (/tre em|gia dinh|vui choi|park|family|cong vien/.test(n)) found.push('family');
  if (/chay|vegan|vegetarian/.test(n)) found.push('chay');
  return found;
}

function isItineraryIntent(text: string): boolean {
  const n = stripVi(text);
  // Detect duration patterns
  if (/(\d{1,2})\s*(ngay|day)/i.test(n)) return true;
  // Detect planning keywords
  if (/lich trinh|itinerary|ke hoach|len lich|tao lich/.test(n)) return true;
  // Detect multiple parameters (e.g. city + preference words that are not just the category)
  const city = extractDestination(text);
  const pTags = extractPrefsTags(text);
  if (city && pTags.length > 0 && text.length > 20) return true;
  return false;
}

export default function AiItineraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<CollectStep>('destination');
  const [input, setInput] = useState('');

  const [destination, setDestination] = useState('');
  const [dayCountStr, setDayCountStr] = useState('');
  const [prefs, setPrefs] = useState<string[]>(['food', 'beach']);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('medium');
  const [startDate, setStartDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiItineraryResponse | null>(null);
  const [acceptedActivityIds, setAcceptedActivityIds] = useState<Set<string>>(new Set());
  const [activityEdits, setActivityEdits] = useState<
    Record<string, { title: string; description: string; startTime: string; duration: string }>
  >({});
  const [editTarget, setEditTarget] = useState<SuggestedActivity | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState('');

  const append = useCallback((role: ChatRole, text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role, text }]);
  }, []);

  useEffect(() => {
    setMessages([
      {
        id: nextId(),
        role: 'assistant',
        text:
          'Chào Hà! Mình là trợ lý AI thiết kế lịch trình.\n\n' +
          'Để bắt đầu, bạn muốn đi **đâu**? Hãy gõ tên thành phố hoặc chọn gợi ý bên dưới nhé.',
      },
    ]);
    setStep('destination');
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages, result, loading]);

  const displayActivity = useCallback(
    (act: SuggestedActivity) => {
      const e = activityEdits[act.id];
      if (e) {
        return {
          title: e.title,
          description: e.description,
          startTime: e.startTime,
          duration: e.duration,
        };
      }
      return {
        title: act.title,
        description: act.description ?? '',
        startTime: act.suggestedStart ?? '',
        duration: act.estimatedDuration ?? '',
      };
    },
    [activityEdits],
  );

  const openEdit = (act: SuggestedActivity) => {
    const d = displayActivity(act);
    setEditTitle(d.title);
    setEditDescription(d.description);
    setEditStartTime(d.startTime);
    setEditDuration(d.duration);
    setEditTarget(act);
  };

  const saveEdit = () => {
    if (!editTarget) return;
    setActivityEdits((prev) => ({
      ...prev,
      [editTarget.id]: {
        title: editTitle.trim() || editTarget.title,
        description: editDescription,
        startTime: editStartTime.trim(),
        duration: editDuration.trim(),
      },
    }));
    setEditTarget(null);
  };

  const resetActivityToOriginal = () => {
    if (!editTarget) return;
    setActivityEdits((prev) => {
      const next = { ...prev };
      delete next[editTarget.id];
      return next;
    });
    setEditTitle(editTarget.title);
    setEditDescription(editTarget.description ?? '');
    setEditStartTime(editTarget.suggestedStart ?? '');
    setEditDuration(editTarget.estimatedDuration ?? '');
  };

  const togglePref = (id: string) => {
    setPrefs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const toggleActivity = (activityId: string, value: boolean) => {
    setAcceptedActivityIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(activityId);
      else next.delete(activityId);
      return next;
    });
  };

  const selectAllInDay = (day: SuggestedDay, value: boolean) => {
    setAcceptedActivityIds((prev) => {
      const next = new Set(prev);
      for (const a of day.activities) {
        if (value) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  };

  const dayFullySelected = (day: SuggestedDay) =>
    day.activities.length > 0 && day.activities.every((a) => acceptedActivityIds.has(a.id));

  const goPreferences = () => {
    setStep('preferences');
    append(
      'assistant',
      'Sở thích du lịch của bạn là gì? Chọn một hoặc nhiều mục, rồi bấm **Xong sở thích**.',
    );
  };

  const goBudget = () => {
    const labels = PREFERENCE_OPTIONS.filter((o) => prefs.includes(o.id)).map((o) => o.label);
    append('user', labels.length ? labels.join(', ') : 'Không chọn cụ thể');
    setStep('budget');
    append(
      'assistant',
      'Mức **ngân sách tham khảo** bạn muốn? Chọn một trong ba mức bên dưới.',
    );
  };

  const goStartDate = (budgetLabel: string) => {
    append('user', budgetLabel);
    setStep('startDate');
    append(
      'assistant',
      'Bạn có **ngày bắt đầu** chuyến đi không? (định dạng YYYY-MM-DD, ví dụ 2026-04-10). Hoặc bấm **Bỏ qua**.',
    );
  };

  const goConfirm = (dateLine: string, overrides?: { dest?: string, days?: string, prefs?: string[], budget?: BudgetTier, start?: string }) => {
    append('user', dateLine);
    
    const finalDest = overrides?.dest ?? destination;
    const finalDays = overrides?.days ?? dayCountStr;
    const finalPrefs = overrides?.prefs ?? prefs;
    const finalBudget = overrides?.budget ?? budgetTier;
    const finalStart = overrides?.start ?? startDate;

    const n = parseInt(finalDays, 10);
    const prefLine = PREFERENCE_OPTIONS.filter((o) => finalPrefs.includes(o.id)).map((o) => o.label).join(', ') || '—';
    const budgetLine = BUDGET_OPTIONS.find((x) => x.tier === finalBudget)?.label ?? '—';
    const datePart = finalStart.trim() ? finalStart.trim() : 'Chưa nhập';
    
    append(
      'assistant',
      `Chào Hà, mình tóm lại yêu cầu nhé:\n• Điểm đến: **${finalDest.trim()}**\n• Số ngày: **${n} ngày**\n• Sở thích: ${prefLine}\n• Ngân sách: **${budgetLine}**\n• Ngày bắt đầu: ${datePart}\n\nBạn bấm **Gợi ý lịch ngay** để mình gọi AI thiết kế, hoặc gõ lại nếu cần chỉnh.`,
    );
    setStep('confirm');
  };

  const processInput = async (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    append('user', raw);
    const n = stripVi(raw);

    // 1. Check for "Submit/Run" intents if we have basic info
    if (destination && dayCountStr && dayCountStr !== '0' && /gợi ý|ok|đồng ý|làm đi|bắt đầu|xong/.test(n.toLowerCase())) {
      void runAiFromChat();
      return;
    }

    // 2. Perform global extraction from current message
    const extractedDest = extractDestination(raw);
    const extractedDays = extractDayCount(raw);
    const extractedBudget = extractBudgetTier(raw);
    const extractedPrefs = extractPrefsTags(raw);

    let updatedDest = destination;
    let updatedDays = dayCountStr;
    let updatedBudget = budgetTier;
    let updatedPrefs = [...prefs];

    let feedbackParts: string[] = [];

    if (extractedDest && extractedDest !== destination) {
      if (SUPPORTED_CITIES_CANON.includes(extractedDest)) {
        updatedDest = extractedDest;
        setDestination(extractedDest);
        feedbackParts.push(`điểm đến **${extractedDest}**`);
      } else if (step === 'destination') {
        // Only show "Unsupported City" error if we are explicitly asking for a destination
        const isNumeric = /^\d+$/.test(raw);
        const isTrash = raw.length < 2 || /^[^a-zA-Zà-ỹÀ-Ỹ ]+$/.test(raw);

        const errorMsg = (isNumeric || isTrash)
          ? `⚠️ **Lỗi: Không nhận diện được địa danh.**\n\nHệ thống không tìm thấy địa điểm **'${raw}'** trong danh sách hỗ trợ.\n\nBạn hãy gõ tên tỉnh/thành phố (ví dụ: Hà Nội, Đà Nẵng, Phú Quốc...) hoặc chọn gợi ý bên dưới giúp mình nhé.`
          : `Xin lỗi Hà, hiện tại mình mới chỉ hỗ trợ dữ liệu cho 12 tỉnh/thành phố phổ biến: ${SUPPORTED_CITIES_CANON.join(', ')}.\n\nĐịa điểm **'${extractedDest}'** chưa có trong hệ thống, bạn vui lòng chọn lại nhé! ✨`;

        append('assistant', errorMsg);
        setStep('destination');
        return; // HALT execution
      }
    } else if (step === 'destination' && !extractedDest) {
      // Step-specific safeguard
      append('assistant', `⚠️ **Lỗi: Vui lòng nhập tên địa danh.**\n\nMình chưa nhận diện được điểm đến của bạn. Bạn muốn đi đâu? (Ví dụ: Hà Nội, Đà Lạt...)`);
      return;
    }

    if (extractedDays) {
      updatedDays = String(extractedDays);
      setDayCountStr(String(extractedDays));
      feedbackParts.push(`trong **${extractedDays} ngày**`);
    }

    if (extractedBudget) {
      updatedBudget = extractedBudget;
      setBudgetTier(extractedBudget);
      const bLabel = BUDGET_OPTIONS.find(x => x.tier === extractedBudget)?.label;
      feedbackParts.push(`ngân sách **${bLabel}**`);
    }

    if (extractedPrefs.length > 0) {
      updatedPrefs = extractedPrefs;
      setPrefs(extractedPrefs);
      const pLabels = PREFERENCE_OPTIONS.filter(o => extractedPrefs.includes(o.id)).map(o => o.label).join(', ');
      feedbackParts.push(`thích **${pLabels}**`);
    }

    // Special check for Start Date
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw))) {
      setStartDate(raw);
      feedbackParts.push(`ngày bắt đầu **${raw}**`);
    }

    // 3. Acknowledge what we found
    if (feedbackParts.length > 0) {
      const ack = `Tuyệt, mình đã ghi nhận: ${feedbackParts.join(', ')}.`;
      append('assistant', ack);
    }

    // 4. Decide "What's missing?" and transition
    if (!updatedDest) {
      setStep('destination');
      append('assistant', 'Bạn muốn đi **đâu**? Hãy gõ tên thành phố nhé.');
      return;
    }

    if (!updatedDays || updatedDays === '0') {
      setStep('days');
      append('assistant', `Bạn định đi **${updatedDest}** trong bao nhiêu ngày? (1-14 ngày)`);
      return;
    }

    // Start checking for secondary info if not provided
    if (updatedPrefs.length === 0 || (updatedPrefs.length === 2 && updatedPrefs.includes('food') && updatedPrefs.includes('beach') && !extractedPrefs.length)) {
      if (step !== 'preferences') {
        setStep('preferences');
        append('assistant', 'Sở thích của bạn là gì? Bạn có thể chọn bên dưới hoặc gõ tự do (ví dụ "mạo hiểm", "văn hóa").');
        return;
      }
    }

    if (!extractedBudget && step !== 'budget' && step !== 'confirm') {
       setStep('budget');
       append('assistant', 'Bạn muốn mức **ngân sách** tham khảo nào? (Tiết kiệm, Vừa phải, Thoải mái)');
       return;
    }

    // If everything is basically filled or user seems done
    goConfirm("Ghi nhận thông tin", { 
      dest: updatedDest, 
      days: updatedDays, 
      budget: updatedBudget, 
      prefs: updatedPrefs 
    });
  };

  const handleDestination = (city: string) => {
    void processInput(city);
  };

  const handleDays = (days: string) => {
    void processInput(days.includes('ngày') ? days : `${days} ngày`);
  };

  const runAiFromChat = async () => {
    const n = parseInt(dayCountStr, 10);
    if (!destination.trim() || Number.isNaN(n) || n < 1 || n > 14) {
      append('assistant', 'Thiếu thông tin hợp lệ. Hãy **Chat mới** và điền lại giúp mình.');
      return;
    }
    append('user', 'Gợi ý lịch ngay');
    setStep('idle');
    setLoading(true);
    append('assistant', 'Đang gọi dịch vụ AI… một chút thôi ✨');
    try {
      const prefLabels = PREFERENCE_OPTIONS.filter((o) => prefs.includes(o.id)).map((o) => o.label);
      const res = await requestAiItinerary({
        destination: destination.trim(),
        dayCount: n,
        preferences: prefLabels,
        budgetTier,
        startDate: startDate.trim() || undefined,
      });
      setResult(res);
      setActivityEdits({});
      const allIds = new Set<string>();
      for (const d of res.days) for (const a of d.activities) allIds.add(a.id);
      setAcceptedActivityIds(allIds);
      setMessages((prev) => prev.filter((m) => !m.text.startsWith('Đang gọi dịch vụ AI')));
      append(
        'assistant',
        'Đây là lịch gợi ý theo từng ngày. Bạn có thể **bật/tắt** từng hoạt động, **chỉnh sửa** nội dung, rồi **Áp dụng vào kế hoạch nháp**.',
      );
    } catch (e) {
      setMessages((prev) => prev.filter((m) => !m.text.startsWith('Đang gọi dịch vụ AI')));
      append(
        'assistant',
        `Ôi, có lỗi: ${e instanceof Error ? e.message : 'không rõ'}. Bạn thử **Gợi ý lịch ngay** lại nhé.`,
      );
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const buildDayPlans = useCallback((): DayPlan[] => {
    if (!result) return [];
    const plans: DayPlan[] = [];
    for (const day of result.days) {
      const acts: SuggestedActivity[] = day.activities.filter((a) => acceptedActivityIds.has(a.id));
      if (acts.length === 0) continue;
      plans.push({
        dayIndex: day.dayIndex,
        label: day.label,
        activities: acts.map((a) => {
          const d = displayActivity(a);
          return {
            id: a.id,
            title: d.title,
            description: d.description.trim() ? d.description : undefined,
            estimatedDuration: d.duration,
            suggestedStart: d.startTime,
          };
        }),
        restaurantNotes: [], // Restaurants are now integrated as activities
      });
    }
    return plans;
  }, [result, acceptedActivityIds, displayActivity]);

  const applyToDraft = () => {
    const plans = buildDayPlans();
    if (plans.length === 0) {
      Alert.alert('Chưa chọn hoạt động', 'Hãy bật ít nhất một hoạt động để áp dụng vào kế hoạch nháp.');
      return;
    }
    applyDayPlansToDraft(plans);
    Alert.alert(
      'Đã áp dụng kế hoạch nháp',
      `Lịch trình ${plans.length} ngày đã được chuyển thành DayPlan (draft) trong kế hoạch của Hà. Bạn có thể kiểm tra ở tab Lịch trình.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  const resetChat = () => {
    msgId = 0;
    setStep('destination');
    setInput('');
    setDestination('');
    setDayCountStr('');
    setPrefs(['food', 'beach']);
    setBudgetTier('medium');
    setStartDate('');
    setResult(null);
    setAcceptedActivityIds(new Set());
    setActivityEdits({});
    setEditTarget(null);
    setLoading(false);
    setMessages([
      {
        id: nextId(),
        role: 'assistant',
        text:
          'Chat mới rồi! Bạn muốn đi **đâu** lần này? Gõ hoặc chọn gợi ý bên dưới.',
      },
    ]);
  };

  const handleDirectQuery = async (text: string): Promise<boolean> => {
    const t = text.toLowerCase();
    const city = extractDestination(text);
    if (!city) return false;

    let category: 'tourism' | 'restaurant' | 'cafe' | null = null;
    if (t.includes('cafe') || t.includes('cà phê')) category = 'cafe';
    else if (t.includes('nhà hàng') || t.includes('ăn') || t.includes('food')) category = 'restaurant';
    else if (t.includes('tham quan') || t.includes('chỗ chơi') || t.includes('địa điểm') || t.includes('du lịch')) category = 'tourism';

    if (category) {
      let results = await requestCityDataSuggestions(city, category, text);
      if (results.length === 0) {
        results = searchCityData(city, category);
      }
      if (results.length > 0) {
        append('user', text);
        const topResults = results.slice(0, 6);
        let resp = `Đây là một số gợi ý **${category === 'cafe' ? 'quán cafe' : category === 'restaurant' ? 'nhà hàng' : 'địa điểm'}** tại **${city}**:\n\n`;
        topResults.forEach((r: any, i: number) => {
          const placeId = r.place_id || r.placeId;
          const mapLink = placeId
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.title || city)}&query_place_id=${encodeURIComponent(placeId)}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.title || city)}`;
          const detail = [
            r.type || '',
            r.address ? `Địa chỉ: ${r.address}` : '',
            r.hours ? `Giờ mở cửa: ${r.hours}` : '',
            r.priceRange ? `Mức giá: ${r.priceRange}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          resp += `${i + 1}. **${r.title}**\n   - ${r.description || 'Địa điểm phổ biến'}\n   - ${detail || 'Chưa có thêm thông tin'}\n   - ⭐ ${r.rating || 'N/A'} (${r.reviews || 0} đánh giá)\n   - 🗺️ Bản đồ: ${mapLink}\n   - 🖼️ Ảnh: ${r.thumbnail || 'Chưa có ảnh'}\n`;
        });
        resp += `\nBạn có muốn mình lập **lịch trình chi tiết** cho chuyến đi đến ${city} không?`;
        append('assistant', resp);
        
        // Nếu user chưa set destination, set luôn
        if (!destination) {
          setDestination(city);
          setStep('days');
        }
        return true;
      }
    }
    return false;
  };

  const onSend = () => {
    const t = input.trim();
    setInput('');
    if (!t) return;
    void processInput(t);
  };

  const composerPlaceholder =
    step === 'destination'
      ? 'Ví dụ: Đà Nẵng'
      : step === 'days'
        ? 'Số ngày (1–14)'
        : step === 'startDate'
          ? 'YYYY-MM-DD hoặc dùng nút Bỏ qua'
          : step === 'confirm'
            ? 'Hoặc bấm nút cam bên dưới'
            : '…';

  const showComposer = !result && !loading && ['destination', 'days', 'startDate', 'confirm'].includes(step);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 56 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Chatbot lịch trình AI',
          headerTintColor: palette.text,
          headerStyle: { backgroundColor: palette.background },
        }}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (showComposer ? 88 : Spacing.lg) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubbleRow, m.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowBot]}
          >
            {m.role === 'assistant' ? (
              <View style={[styles.botAvatar, { backgroundColor: palette.primary }]}>
                <Ionicons name="chatbubbles" size={16} color="#0B1B18" />
              </View>
            ) : null}
            <View
              style={[
                styles.bubble,
                m.role === 'user'
                  ? { backgroundColor: palette.accent }
                  : { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  Typography.body,
                  { color: m.role === 'user' ? '#FFF' : palette.text },
                ]}
              >
                {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
                  const bold = part.startsWith('**') && part.endsWith('**');
                  const inner = bold ? part.slice(2, -2) : part;
                  return bold ? (
                    <Text key={i} style={{ fontWeight: '700' }}>
                      {inner}
                    </Text>
                  ) : (
                    <Text key={i}>{inner}</Text>
                  );
                })}
              </Text>
            </View>
          </View>
        ))}

        {loading ? (
          <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
            <View style={[styles.botAvatar, { backgroundColor: palette.surfaceMuted }]}>
              <Ionicons name="ellipsis-horizontal" size={16} color={palette.textMuted} />
            </View>
            <View style={[styles.bubble, { backgroundColor: palette.surfaceMuted, borderWidth: 0 }]}>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Đang xử lý…</Text>
            </View>
          </View>
        ) : null}

        {result ? (
          <View style={styles.reviewSection}>
            <Card style={{ marginBottom: Spacing.md }}>
              <View style={styles.summaryRow}>
                <Ionicons name="sparkles" size={22} color={palette.accent} />
                <Text style={[Typography.body, { color: palette.text, flex: 1 }]}>{result.summary}</Text>
              </View>
            </Card>

            {result.days.map((day) => (
              <Card key={day.dayIndex} style={{ marginBottom: Spacing.md }}>
                <View style={styles.dayHead}>
                  <View>
                    <Text style={[Typography.titleLG, { color: palette.text }]}>{day.label}</Text>
                    <Text style={[Typography.caption, { color: palette.textMuted }]}>
                      {day.activities.length} hoạt động gợi ý
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => selectAllInDay(day, !dayFullySelected(day))}
                    style={[styles.daySelectBtn, { borderColor: palette.border }]}
                  >
                    <Text style={[Typography.caption, { color: palette.accent, fontWeight: '700' }]}>
                      {dayFullySelected(day) ? 'Bỏ cả ngày' : 'Chọn cả ngày'}
                    </Text>
                  </Pressable>
                </View>

                {day.activities.map((act, actIdx) => {
                  const shown = displayActivity(act);
                  const isAccepted = acceptedActivityIds.has(act.id);
                  const isEdited = Boolean(activityEdits[act.id]);
                  
                  const isRestaurant = act.id.includes('rest') || act.id.includes('lunch') || act.id.includes('dinner');
                  const isCafe = act.id.includes('cafe');
                  
                  const typeLabel = isRestaurant ? 'Nhà hàng' : isCafe ? 'Cà phê' : 'Tham quan';
                  const typeColor = isRestaurant ? '#E67E22' : isCafe ? '#A67C52' : palette.accent;

                  return (
                    <View
                      key={act.id}
                      style={[
                        styles.activityRow,
                        actIdx > 0 && {
                          borderTopColor: palette.border,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <Image 
                        source={{ uri: act.thumbnail || getFallbackImage(isRestaurant, isCafe, destination, act.type, act.title) }} 
                        style={styles.activityThumb}
                        defaultSource={{ uri: getFallbackImage(isRestaurant, isCafe, destination, act.type, act.title) }}
                      />

                      
                      <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                        <View style={styles.activityTitleRow}>
                          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor }]}>
                            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
                          </View>
                          <Text style={[Typography.bodySemi, { color: palette.text, flex: 1 }]} numberOfLines={1}>{shown.title}</Text>
                          {isEdited ? (
                            <Text style={[Typography.caption, { color: palette.accent }]}>(đã sửa)</Text>
                          ) : null}
                        </View>
                        
                        <View style={styles.activityMetaRow}>
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color="#F1C40F" />
                            <Text style={[Typography.caption, { color: palette.text, marginLeft: 2, fontWeight: '700' }]}>
                              {act.rating || '4.5'}
                            </Text>
                            <Text style={[Typography.caption, { color: palette.textMuted, marginLeft: 4 }]}>
                              ({act.reviews || '100+'})
                            </Text>
                          </View>
                          {act.priceRange ? (
                            <Text style={[Typography.caption, { color: palette.primaryPressed, marginLeft: Spacing.sm }]}>
                              {act.priceRange}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.timeRow}>
                          <Ionicons name="time-outline" size={12} color={palette.textMuted} />
                          <Text style={[Typography.caption, { color: palette.textMuted, marginLeft: 4 }]}>
                            {shown.startTime ? `${shown.startTime} · ` : ''}
                            {shown.duration}
                          </Text>
                        </View>
                        
                        {shown.description ? (
                          <View style={{ marginTop: 4 }}>
                            {isEdited && (
                              <Text style={[Typography.caption, { color: palette.primary, fontWeight: '700' }]}>
                                Ghi chú: <Text style={{ fontWeight: '400', fontStyle: 'italic' }}>{shown.description}</Text>
                              </Text>
                            )}
                            {!isEdited && (
                              <Text style={[Typography.caption, { color: palette.textMuted, lineHeight: 16 }]} numberOfLines={2}>
                                {shown.description}
                              </Text>
                            )}
                          </View>
                        ) : null}

                        <View style={styles.activityActions}>
                          <Pressable onPress={() => openEdit(act)} style={styles.editLink}>
                            <Ionicons name="create-outline" size={14} color={palette.accent} style={{ marginRight: 4 }} />
                            <Text style={[Typography.caption, { color: palette.accent, fontWeight: '700' }]}>
                              Sửa
                            </Text>
                          </Pressable>
                          <Pressable 
                            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.title)}`)} 
                            style={[styles.editLink, { marginLeft: Spacing.md }]}
                          >
                            <Ionicons name="map-outline" size={14} color={palette.primaryPressed} style={{ marginRight: 4 }} />
                            <Text style={[Typography.caption, { color: palette.primaryPressed, fontWeight: '700' }]}>
                              Bản đồ
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      <Switch
                        value={acceptedActivityIds.has(act.id)}
                        onValueChange={(v) => toggleActivity(act.id, v)}
                        trackColor={{ false: palette.border, true: palette.primary }}
                      />
                    </View>
                  );
                })}

              </Card>
            ))}

            <Button title="Áp dụng vào kế hoạch nháp (DayPlan)" onPress={applyToDraft} size="lg" />
            <Button title="Chat mới (làm lại từ đầu)" onPress={resetChat} variant="secondary" style={{ marginTop: Spacing.sm }} />
          </View>
        ) : null}
      </ScrollView>

      {!result && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm, borderTopColor: palette.border, backgroundColor: palette.background }]}>
          {step === 'destination' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
              {['Đà Nẵng', 'Hà Nội', 'Nha Trang', 'Đà Lạt'].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    setInput('');
                    handleDestination(c);
                  }}
                  style={[styles.quickChip, { borderColor: palette.border, backgroundColor: palette.surface }]}
                >
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '600' }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {step === 'days' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
              {[3, 5, 7, 10].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    setInput('');
                    handleDays(String(n));
                  }}
                  style={[styles.quickChip, { borderColor: palette.primary, backgroundColor: palette.surface }]}
                >
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '700' }]}>{n} ngày</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {step === 'preferences' ? (
            <View style={styles.prefFooter}>
              <View style={styles.chipRow}>
                {PREFERENCE_OPTIONS.map((o) => {
                  const on = prefs.includes(o.id);
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => togglePref(o.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: on ? palette.primary : palette.surface,
                          borderColor: on ? palette.primaryPressed : palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          Typography.caption,
                          { color: on ? '#0B1B18' : palette.text, fontWeight: '600' },
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Button title="Xong sở thích" onPress={goBudget} size="md" />
            </View>
          ) : null}

          {step === 'budget' ? (
            <View style={styles.budgetRow}>
              {BUDGET_OPTIONS.map((b) => (
                <Pressable
                  key={b.tier}
                  onPress={() => {
                    setBudgetTier(b.tier);
                    goStartDate(b.label);
                  }}
                  style={[
                    styles.budgetPill,
                    {
                      borderColor: budgetTier === b.tier ? palette.accent : palette.border,
                      backgroundColor: palette.surface,
                    },
                  ]}
                >
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '700' }]}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {step === 'startDate' ? (
            <View style={styles.quickScroll}>
              <Pressable
                onPress={() => {
                  setStartDate('');
                  goConfirm('Bỏ qua ngày bắt đầu');
                }}
                style={[styles.quickChip, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}
              >
                <Text style={[Typography.caption, { color: palette.text, fontWeight: '600' }]}>Bỏ qua</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'confirm' ? (
            <Button title="Gợi ý lịch ngay" onPress={() => void runAiFromChat()} loading={loading} disabled={loading} size="lg" />
          ) : null}

          {showComposer ? (
            <View style={[styles.composer, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={composerPlaceholder}
                placeholderTextColor={palette.textMuted}
                style={[styles.composerInput, { color: palette.text }]}
                onSubmitEditing={onSend}
                returnKeyType="send"
              />
              <Pressable
                onPress={onSend}
                style={[styles.sendBtn, { backgroundColor: palette.primary }]}
                disabled={step === 'confirm' ? false : !input.trim()}
              >
                <Ionicons name="send" size={18} color="#0B1B18" />
              </Pressable>
            </View>
          ) : null}

          {!result && step !== 'preferences' && step !== 'budget' && messages.length > 0 ? (
            <Pressable onPress={resetChat} style={styles.newChatText}>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Chat mới</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Modal visible={editTarget !== null} animationType="fade" transparent onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditTarget(null)} />
          <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.titleLG, { color: palette.text }]}>Sửa hoạt động</Text>
            <Text style={[Typography.caption, { color: palette.textMuted, marginTop: Spacing.xs }]}>
              Nội dung sau khi lưu sẽ đi vào DayPlan khi bạn áp dụng.
            </Text>
            <Text style={[Typography.caption, { color: palette.textMuted, marginTop: Spacing.md }]}>Tên</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Điểm thăm / hoạt động"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.modalInput,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceMuted },
              ]}
            />

            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Giờ bắt đầu</Text>
                <TextInput
                  value={editStartTime}
                  onChangeText={setEditStartTime}
                  placeholder="Ví dụ: 08:30"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.modalInput,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceMuted },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Thời lượng</Text>
                <TextInput
                  value={editDuration}
                  onChangeText={setEditDuration}
                  placeholder="Ví dụ: 1.5h"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.modalInput,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceMuted },
                  ]}
                />
              </View>
            </View>

            {editTarget?.description ? (
              <View style={{ marginTop: Spacing.md }}>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Thông tin địa điểm (AI)</Text>
                <Text 
                  style={[Typography.body, { color: palette.text, marginTop: 4, fontStyle: 'italic', opacity: 0.8 }]}
                >
                  "{editTarget.description}"
                </Text>
              </View>
            ) : null}

            <Text style={[Typography.caption, { color: palette.textMuted, marginTop: Spacing.md }]}>
              Ghi chú cá nhân của bạn
            </Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Nhập ghi chú cho hoạt động này..."
              placeholderTextColor={palette.textMuted}
              multiline
              style={[
                styles.modalInputMultiline,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceMuted },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={resetActivityToOriginal} style={styles.modalGhostBtn}>
                <Text style={[Typography.bodySemi, { color: palette.textMuted }]}>Về gợi ý gốc</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setEditTarget(null)} style={styles.modalGhostBtn}>
                <Text style={[Typography.bodySemi, { color: palette.text }]}>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                style={[styles.modalPrimaryBtn, { backgroundColor: palette.primary }]}
              >
                <Text style={[Typography.bodySemi, { color: '#0B1B18' }]}>Lưu</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    maxWidth: '100%',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowBot: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    ...Elevation.card,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  quickScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  prefFooter: {
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  budgetPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    minHeight: 48,
    ...Elevation.card,
  },
  composerInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatText: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
  },
  reviewSection: {
    marginTop: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  daySelectBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  restBlock: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  editLink: {
    paddingVertical: Spacing.xs,
  },
  activityThumb: {
    width: 70,
    height: 70,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  restItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  restThumb: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    ...Elevation.floating,
  },
  modalInput: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  modalInputMultiline: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 88,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalGhostBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  modalPrimaryBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
});
