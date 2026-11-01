/**
 * 確定通知に含めた明細（Notion ページ ID）の記録
 * 支出カテゴリ更新後に同じ内訳を再送するために使う
 */
const KEY_PREFIX = 'NOTIF_'
const MAX_KEEP = 20

/**
 * 確定通知を記録し、通知 ID を返す
 */
export const saveNotification = (pageIds: string[]): string => {
  const notifId = Date.now().toString(36)
  const props = PropertiesService.getScriptProperties()
  props.setProperty(`${KEY_PREFIX}${notifId}`, JSON.stringify(pageIds))

  // 古い記録は削除（通知 ID は時刻ベースなので文字列長 → 辞書順で新しい順になる）
  const keys = props
    .getKeys()
    .filter((key) => key.indexOf(KEY_PREFIX) === 0)
    .sort((a, b) => b.length - a.length || (a < b ? 1 : -1))
  keys.slice(MAX_KEEP).forEach((key) => props.deleteProperty(key))

  return notifId
}

/**
 * 通知 ID から明細のページ ID 一覧を取得（記録がなければ空配列）
 */
export const loadNotification = (notifId: string): string[] => {
  const raw = PropertiesService.getScriptProperties().getProperty(
    `${KEY_PREFIX}${notifId}`,
  )
  return raw ? JSON.parse(raw) : []
}

/**
 * 「新規入力」押下後、次のテキストをカテゴリ名として受け取る待ち状態
 */
const PENDING_KEY = 'PENDING_CATEGORY_INPUT'
const PENDING_TTL_SECONDS = 10 * 60

export type PendingInput = { pageId: string; notifId: string }

export const setPendingInput = (pending: PendingInput) => {
  CacheService.getScriptCache().put(
    PENDING_KEY,
    JSON.stringify(pending),
    PENDING_TTL_SECONDS,
  )
}

export const takePendingInput = (): PendingInput | null => {
  const cache = CacheService.getScriptCache()
  const raw = cache.get(PENDING_KEY)
  if (!raw) return null
  cache.remove(PENDING_KEY)
  return JSON.parse(raw)
}
