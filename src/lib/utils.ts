export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '0 ₫';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} triệu`;
  return formatCurrency(value);
}

export function walletTypeLabel(walletType?: string) {
  const labels: Record<string, string> = {
    ADMIN_SYSTEM: 'Ví hệ thống quản trị',
    BUSINESS: 'Ví doanh nghiệp',
    EXPERT: 'Ví chuyên gia',
    STAFF: 'Ví nhân viên',
  };
  return labels[(walletType || '').toUpperCase()] || 'Ví người dùng';
}

export function formatDate(value?: string) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function maskSensitiveValue(value?: string | number | null, visibleTail = 4) {
  const raw = value == null ? '' : String(value).trim();
  if (!raw) return 'Chưa cập nhật';
  const tailLength = Math.min(Math.max(visibleTail, 0), raw.length);
  const tail = raw.slice(-tailLength);
  return tail ? `•••• ${tail}` : 'Đã cập nhật';
}

export function initials(name?: string) {
  if (!name) return 'AI';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
