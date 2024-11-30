const SPREADSHEET_ID = '1lcFeSKs5wfZSYrl6cfYle9kMvOoHNzzq0OmOlGvws-M'

const prop = PropertiesService.getScriptProperties().getProperties()
const LINE_TOKEN = prop.LINE_TOKEN
const USER_ID = prop.USER_ID

// メール検索条件
const SEARCH_QUERY =
  'from:(minapoooon.6@gmail.com) subject:(カード利用のお知らせ) -label:通知処理済み newer:2024/11/01'

// スプレッドシート関連
const SHEET_NAME = '利用履歴'
const COLUMN_DATE = 0
const COLUMN_VENDOR = 1
const COLUMN_AMOUNT = 2

// メール処理関数
export const processEmails = async () => {
  const threads = GmailApp.search(SEARCH_QUERY)

  if (!threads || threads.length === 0) {
    console.log('処理するメールがありません')
    return
  }

  // スレッドを古い順に並び替え
  const sortedThreads = threads.sort((a, b) => {
    const aDate = a.getLastMessageDate()
    const bDate = b.getLastMessageDate()
    return aDate.getTime() - bDate.getTime()
  })

  const sheet =
    SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)

  if (!sheet) {
    console.error(`スプレッドシート「${SHEET_NAME}」が見つかりません`)
    return
  }

  const processedRows: string[] = []
  let monthlyTotal = 0

  for (const thread of sortedThreads) {
    const messages = thread.getMessages()
    for (const message of messages) {
      const body = message.getBody()
      const { date, place, amount } = extractEmailData(body)

      if (date && amount) {
        const existingRow = findRow(sheet, date, amount)
        if (existingRow) {
          // 確定版通知: 利用先を更新
          if (place) {
            sheet
              .getRange(existingRow.row + 1, COLUMN_VENDOR + 1)
              .setValue(place)
            processedRows.push(`更新: ${date} - ${place} - ${amount}`)
          }
        } else {
          // 新規エントリ追加
          const newRow = [date, place || '', amount]
          sheet.appendRow(newRow)
          processedRows.push(`追加: ${date} - ${place || '未定'} - ${amount}`)
        }
        monthlyTotal += parseInt(amount.replace(/[^0-9]/g, ''), 10)
      }
    }
    thread.addLabel(GmailApp.getUserLabelByName('通知処理済み'))
  }

  sendLineNotification(processedRows, monthlyTotal)
}

// メール本文からデータ抽出
const extractEmailData = (body: string) => {
  const dateMatch = body.match(/MxMQF\|: (\d{4}\/\d{2}\/\d{2})/)
  const amountMatch = body.match(/MxMQ6b3\[ (\d{1,3}(,\d{3})*)/)
  const placeMatch = body.match(/MxMQ@h: (.+)/)

  return {
    date: dateMatch ? dateMatch[1] : null,
    amount: amountMatch ? amountMatch[1].replace(/,/g, '') : null,
    place: placeMatch ? placeMatch[1].trim() : null,
  }
}

// スプレッドシート内の行検索
const findRow = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  date: string,
  amount: string
) => {
  const data = sheet.getDataRange().getValues()
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMN_DATE] === date && data[i][COLUMN_AMOUNT] === amount) {
      return { row: i, values: data[i] }
    }
  }
  return null
}

// LINE通知送信
const sendLineNotification = async (rows: string[], total: number) => {
  const url = 'https://api.line.me/v2/bot/message/push'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${LINE_TOKEN}`,
  }

  const body = {
    to: USER_ID,
    messages: [
      {
        type: 'flex',
        altText: '楽天カード利用通知',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '楽天カード利用通知',
                weight: 'bold',
                size: 'lg',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: rows.map((row) => ({
              type: 'text',
              text: row,
              wrap: true,
            })),
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `今月の利用合計: ${total}円`,
                weight: 'bold',
                size: 'md',
              },
            ],
          },
        },
      },
    ],
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers,
      payload: JSON.stringify(body),
    })

    if (response.getResponseCode() !== 200) {
      console.error(
        `LINE通知の送信に失敗しました: ${response.getContentText()}`
      )
    }
  } catch (error) {
    console.error('LINE通知送信中にエラーが発生しました:', error)
  }
}

// 定期実行
export const triggerFunction = () => {
  processEmails().catch((error) => console.error(error))
}
