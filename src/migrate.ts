import { createUsage, queryUsagesSince } from './notion'

const SHEET_NAME = '利用履歴'

/**
 * スプレッドシート「利用履歴」の先月分を Notion に移行する（1 回限りの移行用）
 * 同じ 利用日・利用金額・利用先 の明細が Notion に既にあればスキップする
 */
export const migrateFromSpreadsheet = () => {
  const timeZone = Session.getScriptTimeZone()
  const now = new Date()
  const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const targetMonth = Utilities.formatDate(
    firstDayOfPrevMonth,
    timeZone,
    'yyyy-MM',
  )

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error(`Sheet not found: ${SHEET_NAME}`)

  const [headers, ...rows] = sheet.getDataRange().getValues()
  const col = {
    date: headers.indexOf('利用日'),
    place: headers.indexOf('利用先'),
    amount: headers.indexOf('利用金額'),
  }
  if (col.date < 0 || col.place < 0 || col.amount < 0) {
    throw new Error(`Header not found: ${headers.join(', ')}`)
  }

  const existing = queryUsagesSince(`${targetMonth}-01`)
  const exists = (date: string, amount: number, place: string) =>
    existing.some(
      (usage) =>
        usage.date === date && usage.amount === amount && usage.place === place,
    )

  let created = 0
  let skipped = 0
  rows.forEach((row) => {
    const date = toIsoDate(row[col.date], timeZone)
    if (!date || date.indexOf(targetMonth) !== 0) return

    const amount = Number(String(row[col.amount]).replace(/,/g, ''))
    const place = String(row[col.place] ?? '').trim()
    if (!amount) return

    if (exists(date, amount, place)) {
      skipped++
      return
    }
    createUsage({ date, amount, place })
    created++
  })

  console.log(`${targetMonth}: created ${created}, skipped ${skipped}`)
}

/**
 * セルの値（Date か "yyyy/MM/dd" 文字列）を yyyy-MM-dd に変換
 */
const toIsoDate = (value: unknown, timeZone: string): string => {
  if (value instanceof Date) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd')
  }
  const text = String(value ?? '').trim()
  return /^\d{4}\/\d{2}\/\d{2}$/.test(text) ? text.replace(/\//g, '-') : ''
}
