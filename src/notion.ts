const prop = PropertiesService.getScriptProperties().getProperties()
const NOTION_TOKEN = prop.NOTION_TOKEN
const NOTION_DATABASE_ID = prop.NOTION_DATABASE_ID

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
// 一時的なネットワークエラー・レート制限時のリトライ回数
const MAX_ATTEMPTS = 3

/**
 * Notion データベースのプロパティ名
 */
export const PROPERTY = {
  place: '利用先',
  date: '利用日',
  amount: '利用金額',
  category: '支出カテゴリ',
} as const

/**
 * 利用明細 1 件分
 */
export type UsageEntry = {
  pageId: string
  /** yyyy-MM-dd */
  date: string
  amount: number
  place: string
  category: string
}

/**
 * Notion API へのリクエスト
 */
const request = (
  method: GoogleAppsScript.URL_Fetch.HttpMethod,
  path: string,
  payload?: object,
) => {
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
    },
    contentType: 'application/json',
    muteHttpExceptions: true,
  }
  if (payload) options.payload = JSON.stringify(payload)

  const url = `${NOTION_API_BASE}${path}`
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) Utilities.sleep(1000 * (attempt - 1))

    let response: GoogleAppsScript.URL_Fetch.HTTPResponse
    try {
      response = UrlFetchApp.fetch(url, options)
    } catch (error) {
      // GAS の UrlFetchApp は一時的なネットワークエラーで例外（使用できないアドレス 等）を投げることがある
      lastError = error
      continue
    }

    const code = response.getResponseCode()
    const body = response.getContentText()
    if (code >= 200 && code < 300) return JSON.parse(body)

    lastError = new Error(`Notion API error ${code} ${method} ${path}: ${body}`)
    // レート制限・サーバーエラー以外はリトライしない
    if (code !== 429 && code < 500) throw lastError
  }
  throw lastError
}

/**
 * Notion のページオブジェクトを UsageEntry に変換
 */
const toUsageEntry = (page: any): UsageEntry => {
  const props = page.properties
  const title: any[] = props[PROPERTY.place]?.title ?? []
  return {
    pageId: page.id,
    date: props[PROPERTY.date]?.date?.start ?? '',
    amount: props[PROPERTY.amount]?.number ?? 0,
    place: title.map((t) => t.plain_text).join(''),
    category: props[PROPERTY.category]?.select?.name ?? '',
  }
}

/**
 * 利用明細を Notion に追加
 * @returns 作成したページ ID
 */
export const createUsage = (entry: {
  date: string
  amount: number
  place: string
}): string => {
  const page = request('post', '/pages', {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      [PROPERTY.place]: {
        title: [{ text: { content: entry.place } }],
      },
      [PROPERTY.date]: { date: { start: entry.date } },
      [PROPERTY.amount]: { number: entry.amount },
    },
  })
  return page.id
}

/**
 * 利用明細を更新（指定したプロパティのみ）
 */
export const updateUsage = (
  pageId: string,
  update: { place?: string; category?: string },
) => {
  const properties: Record<string, object> = {}
  if (update.place !== undefined) {
    properties[PROPERTY.place] = {
      title: [{ text: { content: update.place } }],
    }
  }
  if (update.category !== undefined) {
    // 存在しない選択肢名を指定すると Notion 側で自動的に選択肢が追加される
    properties[PROPERTY.category] = { select: { name: update.category } }
  }
  request('patch', `/pages/${pageId}`, { properties })
}

/**
 * 利用明細を 1 件取得
 */
export const getUsage = (pageId: string): UsageEntry => {
  return toUsageEntry(request('get', `/pages/${pageId}`))
}

/**
 * 指定日以降の利用明細を全件取得
 * @param since yyyy-MM-dd
 */
export const queryUsagesSince = (since: string): UsageEntry[] => {
  const entries: UsageEntry[] = []
  let cursor: string | undefined
  do {
    const payload: Record<string, unknown> = {
      filter: { property: PROPERTY.date, date: { on_or_after: since } },
      page_size: 100,
    }
    if (cursor) payload.start_cursor = cursor
    const result = request(
      'post',
      `/databases/${NOTION_DATABASE_ID}/query`,
      payload,
    )
    result.results.forEach((page: any) => entries.push(toUsageEntry(page)))
    cursor = result.has_more ? result.next_cursor : undefined
  } while (cursor)
  return entries
}

/**
 * 支出カテゴリの選択肢一覧を取得
 */
export const getCategoryOptions = (): string[] => {
  const database = request('get', `/databases/${NOTION_DATABASE_ID}`)
  const options: any[] =
    database.properties[PROPERTY.category]?.select?.options ?? []
  return options.map((option) => option.name)
}
