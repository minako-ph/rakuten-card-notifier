import { getColumnIndexMap, appendRow } from './spreadsheet'
import { sendPushMessage } from './line'

const LABEL_NAME = '通知処理済み'

/**
 * メール処理のメインロジック
 */
export const processEmails = () => {
  // 速報版と確定版のメールをそれぞれ検索
  const notificationThreads = GmailApp.search(
    `from:(@mail.rakuten-card.co.jp) after:2025/02/01 subject:【速報版】カード利用のお知らせ(本人ご利用分) -label:${LABEL_NAME}`,
  )

  const confirmedThreads = GmailApp.search(
    `from:(@mail.rakuten-card.co.jp) after:2025/02/01 subject:カード利用のお知らせ(本人ご利用分) -label:${LABEL_NAME}`,
  )

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('利用履歴')
  if (!sheet) throw new Error('Sheet not found')

  const indexMap = getColumnIndexMap(sheet)

  const notificationEntries: any[] = []
  const confirmedEntries: any[] = []

  // 速報版メールの処理
  notificationThreads.forEach((thread) => {
    const messages = thread.getMessages()
    messages.forEach((message) => {
      const body = message.getPlainBody()
      const details = parseEmailBodyForDetails(body, false) // 明細をすべて抽出
      details.forEach(({ date, amount }) => {
        appendRow(sheet, [date, '', amount])
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
        const updated = updateConfirmedRow(sheet, date, amount, place, indexMap)
        if (!updated) {
          appendRow(sheet, [date, place, amount])
        }
        confirmedEntries.push({ date, amount, place })
      })
    })

    // スレッドにラベルを追加
    thread.addLabel(GmailApp.getUserLabelByName(LABEL_NAME))
  })

  const totalAmount = calculateTotal(sheet, indexMap)
  sendNotificationToLine(notificationEntries, confirmedEntries, totalAmount)
}

/**
 * メール本文を解析して利用明細を抽出する関数
 */
const parseEmailBodyForDetails = (
  body: string,
  confirmed: boolean,
): { date: string; amount: string; place: string }[] => {
  // 本文のデコード（ISO-2022-JP対応）
  const decodedBody = decodeISO2022JP(body)

  const details: { date: string; amount: string; place: string }[] = []

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
      const date = match[1]
      const place = match[2].trim()
      const amount = match[3].replace(/,/g, '') // カンマを削除

      details.push({ date, amount, place })
    }
  } else {
    // 速報版メールの解析
    while ((match = notificationPattern.exec(decodedBody)) !== null) {
      const date = match[1]
      const amount = match[2].replace(/,/g, '') // カンマを削除

      details.push({ date, amount, place: '' }) // 速報版は利用先なし
    }
  }

  return details
}

/**
 * ISO-2022-JPをUTF-8にデコードする関数
 */
const decodeISO2022JP = (input: string): string => {
  const blob = Utilities.newBlob(input, 'text/plain', 'ISO-2022-JP')
  return blob.getDataAsString('UTF-8')
}

/**
 * 確定版メールでスプレッドシートを更新
 */
const updateConfirmedRow = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  date: string,
  amount: string,
  place: string,
  indexMap: Record<string, number>,
): boolean => {
  const data = sheet.getDataRange().getValues()

  for (let i = 1; i < data.length; i++) {
    // 日付をISO形式（YYYY-MM-DD）に統一
    const sheetDate = new Date(data[i][indexMap['利用日']])
      .toISOString()
      .split('T')[0]
    const targetDate = new Date(date).toISOString().split('T')[0]

    // 金額を文字列に統一
    const sheetAmount = String(data[i][indexMap['利用金額']])
    const targetAmount = String(amount)

    if (
      sheetDate === targetDate &&
      sheetAmount === targetAmount &&
      !data[i][indexMap['利用先']]
    ) {
      sheet.getRange(i + 1, indexMap['利用先'] + 1).setValue(place)
      return true
    }
  }
  return false
}

/**
 * スプレッドシートから今月の利用金額合計を計算
 */
const calculateTotal = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  indexMap: Record<string, number>,
): number => {
  const data = sheet.getDataRange().getValues()
  const currentMonth = new Date().getMonth() + 1
  return data.slice(1).reduce((sum, row) => {
    const date = new Date(row[indexMap['利用日']])
    if (date.getMonth() + 1 === currentMonth) {
      return sum + row[indexMap['利用金額']]
    }
    return sum
  }, 0)
}

/**
 * LINE通知を送信
 */
const sendNotificationToLine = (
  notificationEntries: any[],
  confirmedEntries: any[],
  totalAmount: number,
) => {
  const flexContents = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd')} 時点の楽天カード利用金額通知`,
          weight: 'bold',
          size: 'md',
          margin: 'none',
        },
        {
          type: 'separator',
          margin: 'xxl',
        },
        {
          type: 'text',
          text: '速報通知',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: notificationEntries.map((entry) => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: entry.date },
              {
                type: 'text',
                text: `${Number(entry.amount).toLocaleString()} 円`,
                align: 'end',
              },
            ],
          })),
          margin: 'md',
        },
        {
          type: 'text',
          text: '今月の利用金額合計',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'text',
          text: `${Number(totalAmount).toLocaleString()} 円`,
          align: 'end',
          margin: 'md',
        },
        {
          type: 'text',
          text: '今月の利用可能金額消化率',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '30万円の場合',
                      margin: 'sm',
                      weight: 'bold',
                      size: 'sm',
                    },
                    {
                      type: 'text',
                      text: `${Math.round((totalAmount / 300000) * 100).toLocaleString()}% 消化済み`,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: `残 ${(300000 - totalAmount).toLocaleString()} 円`,
                  align: 'end',
                },
              ],
              spacing: 'sm',
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '40万円の場合',
                      margin: 'sm',
                      weight: 'bold',
                      size: 'sm',
                    },
                    {
                      type: 'text',
                      text: `${Math.round((totalAmount / 400000) * 100).toLocaleString()}% 消化済み`,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: `残 ${(400000 - totalAmount).toLocaleString()} 円`,
                  align: 'end',
                },
              ],
            },
          ],
          margin: 'md',
          spacing: 'sm',
        },
        {
          type: 'separator',
          margin: 'xxl',
        },
        {
          type: 'text',
          text: '確定通知',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: confirmedEntries.map((entry) => ({
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: entry.date },
                  {
                    type: 'text',
                    text: `${Number(entry.amount).toLocaleString()} 円`,
                    align: 'end',
                  },
                ],
              },
              {
                type: 'text',
                text: entry.place,
                align: 'end',
              },
            ],
          })),
          margin: 'sm',
          spacing: 'sm',
        },
      ],
    },
  }

  const messages = [
    {
      type: 'flex',
      altText: '楽天カード利用通知',
      contents: flexContents,
    },
  ]
  sendPushMessage(messages)
}

export const sample = () => {
  const flexContents = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '今日時点の楽天カード利用金額通知',
          weight: 'bold',
          size: 'md',
          margin: 'none',
        },
        {
          type: 'separator',
          margin: 'xxl',
        },
        {
          type: 'text',
          text: '速報通知',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '2025/01/22',
                },
                {
                  type: 'text',
                  text: '3,250 円',
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '2025/01/23',
                },
                {
                  type: 'text',
                  text: '1,610 円',
                  align: 'end',
                },
              ],
            },
          ],
          margin: 'md',
        },
        {
          type: 'text',
          text: '今月の利用金額合計',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'text',
          text: '143,235 円',
          align: 'end',
          margin: 'md',
        },
        {
          type: 'text',
          text: '今月の利用可能金額消化率',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '20万円の場合',
                      margin: 'sm',
                      weight: 'bold',
                      size: 'sm',
                    },
                    {
                      type: 'text',
                      text: '72% 消化済み',
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: '残 56,765 円',
                  align: 'end',
                },
              ],
              spacing: 'sm',
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '30万円の場合',
                      margin: 'sm',
                      weight: 'bold',
                      size: 'sm',
                    },
                    {
                      type: 'text',
                      text: '48% 消化済み',
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: '残 156,765 円',
                  align: 'end',
                },
              ],
            },
          ],
          margin: 'md',
          spacing: 'sm',
        },
        {
          type: 'separator',
          margin: 'xxl',
        },
        {
          type: 'text',
          text: '確定通知',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '2025/01/19',
                    },
                    {
                      type: 'text',
                      text: '850 円',
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: 'ｻﾝﾌﾟﾙｺﾝﾋﾞﾆ',
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '2025/01/20',
                    },
                    {
                      type: 'text',
                      text: '2,310 円',
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: 'ｻﾝﾌﾟﾙﾁｮｳｻﾞｲﾔｯｷｮｸ',
                  align: 'end',
                },
              ],
            },
          ],
          margin: 'sm',
          spacing: 'sm',
        },
      ],
    },
  }

  const messages = [
    {
      type: 'flex',
      altText: '楽天カード利用通知',
      contents: flexContents,
    },
  ]

  sendPushMessage(messages)
}
