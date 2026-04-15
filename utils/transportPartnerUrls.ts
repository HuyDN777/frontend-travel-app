/**
 * Gắn tham số tìm kiếm lên URL đối tác (không có API chính thức — có thể không khớp 100% form web).
 */

function toSlugPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const CITY_ALIAS: Array<{ keywords: string[]; name: string }> = [
  { keywords: ['tphcm', 'tp hcm', 'tp.hcm', 'sai gon', 'saigon', 'ho chi minh'], name: 'Sài Gòn' },
  { keywords: ['ha noi', 'hanoi'], name: 'Hà Nội' },
  { keywords: ['da nang', 'danang'], name: 'Đà Nẵng' },
  { keywords: ['nghe an'], name: 'Nghệ An' },
  { keywords: ['nha trang'], name: 'Nha Trang' },
  { keywords: ['can tho'], name: 'Cần Thơ' },
];

function normalizeCityName(value: string) {
  const slug = toSlugPart(value);
  const hit = CITY_ALIAS.find((x) => x.keywords.some((k) => slug.includes(toSlugPart(k))));
  return hit?.name ?? value.trim();
}

export function buildVexereSearchUrl(from: string, to: string, dateYmd: string): string {
  const f = normalizeCityName(from || '');
  const t = normalizeCityName(to || '');
  const d = (dateYmd || '').trim();
  if (!f || !t || !d) {
    return 'https://vexere.com/vi-VN/';
  }
  const p = new URLSearchParams();
  p.set('departure', f);
  p.set('arrival', t);
  p.set('departureDate', d);
  return `https://vexere.com/vi-VN/?${p.toString()}`;
}

export function buildVexereOperatorSearchUrl(
  from: string,
  to: string,
  dateYmd: string,
  operatorName?: string
): string {
  const url = new URL(buildVexereSearchUrl(from, to, dateYmd));
  const op = (operatorName || '').trim();
  if (op) {
    url.searchParams.set('operator', op);
    url.searchParams.set('q', op);
  }
  return url.toString();
}

/** 12go không công bố URL tìm kiếm ổn định theo tuyến — mở trang chủ (user chọn điểm trong web). */
export function build12goHomeUrl(): string {
  return 'https://12go.asia/en';
}
