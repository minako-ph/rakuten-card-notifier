/**
 * LINE の postback データ（最大 300 文字）のエンコード / デコード
 */
export type EntryPostbackAction = 'pick' | 'set' | 'new'

/** 明細 1 件に対する操作 */
export type EntryPostbackData = {
  /** pick: カテゴリ一覧を表示 / set: カテゴリを設定 / new: 新規カテゴリ名の入力待ちにする */
  action: EntryPostbackAction
  /** Notion のページ ID */
  pageId: string
  /** 再送対象の確定通知を特定する ID */
  notifId: string
  /** set のときのカテゴリ名 */
  category?: string
}

/** 今月分のカテゴリ別内訳を表示 */
export type BreakdownPostbackData = { action: 'breakdown' }

export type PostbackData = EntryPostbackData | BreakdownPostbackData

const isEntryPostbackAction = (value: string): value is EntryPostbackAction =>
  value === 'pick' || value === 'set' || value === 'new'

export const buildPostbackData = (data: PostbackData): string => {
  if (data.action === 'breakdown') return 'a=breakdown'

  const params = [`a=${data.action}`, `p=${data.pageId}`, `n=${data.notifId}`]
  if (data.category !== undefined) {
    params.push(`c=${encodeURIComponent(data.category)}`)
  }
  return params.join('&')
}

export const parsePostbackData = (raw: string): PostbackData | null => {
  const params: Record<string, string> = {}
  raw.split('&').forEach((pair) => {
    const index = pair.indexOf('=')
    if (index < 0) return
    params[pair.slice(0, index)] = decodeURIComponent(pair.slice(index + 1))
  })
  const action = params.a
  if (action === 'breakdown') return { action }
  if (!action || !isEntryPostbackAction(action) || !params.p || !params.n) {
    return null
  }
  return {
    action,
    pageId: params.p,
    notifId: params.n,
    category: params.c,
  }
}
