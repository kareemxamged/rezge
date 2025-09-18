/**
 * نتيجة فحص حدود طلبات تحديث معلومات التواصل
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason: 'allowed' | 'daily_limit_reached';
  daily_requests_used: number;
  daily_requests_limit: number;
  pending_requests_used: number;
  pending_requests_limit: number;
  wait_minutes: number;
  pending_wait_hours: number;
  blocked_until: string | null;
  next_reset: string;
}

/**
 * نتيجة تسجيل طلب جديد
 */
export interface RecordRequestResult {
  success: boolean;
  daily_requests_count: number;
  daily_requests_limit: number;
  next_allowed_at: string | null;
  blocked_until: string | null;
}

/**
 * نتيجة تسجيل طلب معلق
 */
export interface RecordPendingRequestResult {
  success: boolean;
  pending_requests_count: number;
  pending_requests_limit: number;
  blocked_until: string | null;
}
