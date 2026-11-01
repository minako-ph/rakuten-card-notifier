/**
 * LINE の postback データ（最大 300 文字）のエンコード / デコード
 */
export type PostbackAction = 'pick' | 'set' | 'new'

export type PostbackData = {
  /** pick: カテゴリ一覧を表示 / set: カテゴリを設定 / new: 新規カテゴリ名の入力待ちにする */
  action: PostbackAction
  /** Notion のページ ID */
  pageId: string
  /** 再送対象の確定通知を特定する ID */
  notifId: string
  /** set のときのカテゴリ名 */
  category?: string
}

const isPostbackAction = (value: string): value is PostbackAction =>
  value === 'pick' || value === 'set' || value === 'new'

export const buildPostbackData = (data: PostbackData): string => {
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
  if (!action || !isPostbackAction(action) || !params.p || !params.n) {
    return null
  }
  return {
    action,
    pageId: params.p,
    notifId: params.n,
    category: params.c,
  }
}
