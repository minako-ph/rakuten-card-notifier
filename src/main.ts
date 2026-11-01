import {
  createUsage,
  queryUsagesSince,
  updateUsage,
  UsageEntry,
} from './notion'
import { saveNotification } from './notifications'
import { sendPushMessage } from './line'
import { buildNotificationMessage, NotificationEntry } from './flex'

const LABEL_NAME = '通知処理済み'

/**
 * メール処理のメインロジック
 */
export const processEmails = () => {
  // 今月の頭を取得
  const now = new Date()
  const timeZone = Session.getScriptTimeZone()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const formattedDate = Utilities.formatDate(
    firstDayOfMonth,
    timeZone,
    'yyyy/MM/dd',
  )

  // 速報版と確定版のメールをそれぞれ検索
  const notificationThreads = GmailApp.search(
    `from:(@mail.rakuten-card.co.jp) after:${formattedDate} subject:【速報版】カード利用のお知らせ(本人ご利用分) -label:${LABEL_NAME}`,
  )

  const confirmedThreads = GmailApp.search(
    `from:(@mail.rakuten-card.co.jp) after:${formattedDate} subject:カード利用のお知らせ(本人ご利用分) -label:${LABEL_NAME}`,
  )

  // 先月以降の明細を Notion から取得（月初に届く前月分の確定版と突き合わせるため先月分も含める）
  const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const usages = queryUsagesSince(
    Utilities.formatDate(firstDayOfPrevMonth, timeZone, 'yyyy-MM-dd'),
  )

  const notificationEntries: NotificationEntry[] = []
  const confirmedEntries: UsageEntry[] = []

  // 速報版メールの処理
  notificationThreads.forEach((thread) => {
    const messages = thread.getMessages()
    messages.forEach((message) => {
      const body = message.getPlainBody()
      const details = parseEmailBodyForDetails(body, false) // 明細をすべて抽出
      details.forEach(({ date, amount }) => {
        const pageId = createUsage({ date, amount, place: '' })
        usages.push({ pageId, date, amount, place: '', category: '' })
        notificationEntries.push({ date, amount })
      })
    })

    // スレッドにラベルを追加
    thread.addLabel(GmailApp.getUserLabelByName(LABEL_NAME))
  })

  // 確定版メールの処理
  confirmedThreads.forEach((thread) => {
    const messages = thread.getMessages()
    messages.forEach((message) => {
      const body = message.getPlainBody()
      const details = parseEmailBodyForDetails(body, true) // 明細をすべて抽出
      details.forEach(({ date, amount, place }) => {
        // 速報版で登録済み（利用先が空）の明細があればそれを更新、なければ新規追加
        const target = usages.find(
          (usage) =>
            usage.date === date && usage.amount === amount && !usage.place,
        )
        if (target) {
          updateUsage(target.pageId, { place })
          target.place = place
          confirmedEntries.push(target)
        } else {
          const pageId = createUsage({ date, amount, place })
          const entry = { pageId, date, amount, place, category: '' }
          usages.push(entry)
          confirmedEntries.push(entry)
        }
      })
    })

    // スレッドにラベルを追加
    thread.addLabel(GmailApp.getUserLabelByName(LABEL_NAME))
  })

  const totalAmount = calculateTotal(usages, now)
  const notifId = saveNotification(
    confirmedEntries.map((entry) => entry.pageId),
  )
  sendPushMessage([
    buildNotificationMessage(
      notificationEntries,
      confirmedEntries,
      totalAmount,
      notifId,
    ),
  ])
}

/**
 * メール本文を解析して利用明細を抽出する関数
 */
const parseEmailBodyForDetails = (
  body: string,
  confirmed: boolean,
): { date: string; amount: number; place: string }[] => {
  // 本文のデコード（ISO-2022-JP対応）
  const decodedBody = decodeISO2022JP(body)

  const details: { date: string; amount: number; place: string }[] = []

  // 速報版用の正規表現（利用日・利用金額）
  const notificationPattern =
    /■利用日:\s*(\d{4}\/\d{2}\/\d{2})\s*■利用者:\s*本人\s*■利用金額:\s*([\d,]+)\s*円/g

  // 確定版用の正規表現（利用日・利用金額・利用先）
  const confirmedPattern =
    /■利用日:\s*(\d{4}\/\d{2}\/\d{2})\s*■利用先:\s*([^\n\r]+)\s*■利用者:\s*本人\s*■支払方法:\s*[^\n\r]+\s*■利用金額:\s*([\d,]+)\s*円/g

  let match: RegExpExecArray | null

  if (confirmed) {
    // 確定版メールの解析
    while ((match = confirmedPattern.exec(decodedBody)) !== null) {
      const date = toIsoDate(match[1])
      const place = match[2].trim()
      const amount = parseAmount(match[3])

      details.push({ date, amount, place })
    }
  } else {
    // 速報版メールの解析
    while ((match = notificationPattern.exec(decodedBody)) !== null) {
      const date = toIsoDate(match[1])
      const amount = parseAmount(match[2])

      details.push({ date, amount, place: '' }) // 速報版は利用先なし
    }
  }

  return details
}

/** yyyy/MM/dd → yyyy-MM-dd（Notion の日付形式） */
const toIsoDate = (date: string) => date.replace(/\//g, '-')

/** "1,234" → 1234 */
const parseAmount = (amount: string) => Number(amount.replace(/,/g, ''))

/**
 * ISO-2022-JPをUTF-8にデコードする関数
 */
const decodeISO2022JP = (input: string): string => {
  const blob = Utilities.newBlob(input, 'text/plain', 'ISO-2022-JP')
  return blob.getDataAsString('UTF-8')
}

/**
 * 今月の利用金額合計を計算
 */
const calculateTotal = (usages: UsageEntry[], now: Date): number => {
  const currentMonth = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    'yyyy-MM',
  )
  return usages.reduce((sum, usage) => {
    if (usage.date.indexOf(currentMonth) === 0) {
      return sum + usage.amount
    }
    return sum
  }, 0)
}
