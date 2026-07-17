import type { NotificationPreferences } from '@/lib/types'

/** Preferensi in-app saja — tidak ada pengiriman WA/email eksternal di MVP. */
export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  orders: true,
  stock: true,
  ai: true,
  weekly: false,
  wa: false,
  email: false,
}

export function normalizeNotifications(
  input?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  return {
    orders: input?.orders ?? DEFAULT_NOTIFICATIONS.orders,
    stock: input?.stock ?? DEFAULT_NOTIFICATIONS.stock,
    ai: input?.ai ?? DEFAULT_NOTIFICATIONS.ai,
    weekly: input?.weekly ?? DEFAULT_NOTIFICATIONS.weekly,
    // Channel eksternal dimatikan di MVP (tidak ada gateway)
    wa: false,
    email: false,
  }
}

export function normalizeLocale(value: unknown): 'id' | 'en' {
  return value === 'en' ? 'en' : 'id'
}
