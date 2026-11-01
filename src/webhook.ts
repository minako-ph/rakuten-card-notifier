import { sendReplyMessage, USER_ID } from './line'
import { getCategoryOptions, getUsage, updateUsage } from './notion'
import {
  loadNotification,
  setPendingInput,
  takePendingInput,
} from './notifications'
import { parsePostbackData, PostbackData } from './postback'
import { buildCategoryPickerMessage, buildConfirmedListMessage } from './flex'

/**
 * LINE Webhook の受け口（GAS Web アプリ）
 */
export const doPost = (e: GoogleAppsScript.Events.DoPost) => {
  try {
    const body = JSON.parse(e.postData.contents)
    const events: any[] = body.events ?? []
    events.forEach((event) => {
      try {
        handleEvent(event)
      } catch (error) {
        console.error(error)
        if (event.replyToken) {
          sendReplyMessage(event.replyToken, [
            { type: 'text', text: `エラーが発生しました\n${String(error)}` },
          ])
        }
      }
    })
  } catch (error) {
    console.error(error)
  }
  return ContentService.createTextOutput('ok')
}

const handleEvent = (event: any) => {
  // 自分以外からのイベントは無視
  if (!event.source || event.source.userId !== USER_ID) return

  if (event.type === 'postback') {
    const data = parsePostbackData(event.postback.data)
    if (!data) return
    handlePostback(event.replyToken, data)
    return
  }

  if (event.type === 'message' && event.message.type === 'text') {
    handleTextMessage(event.replyToken, event.message.text)
  }
}

const handlePostback = (replyToken: string, data: PostbackData) => {
  switch (data.action) {
    case 'pick': {
      // 支出カテゴリの選択肢を表示
      const entry = getUsage(data.pageId)
      const options = getCategoryOptions()
      sendReplyMessage(replyToken, [
        buildCategoryPickerMessage(entry, options, data.notifId),
      ])
      return
    }
    case 'set': {
      if (!data.category) return
      applyCategory(replyToken, data.pageId, data.notifId, data.category)
      return
    }
    case 'new': {
      // 次のテキストメッセージをカテゴリ名として受け取る
      setPendingInput({ pageId: data.pageId, notifId: data.notifId })
      sendReplyMessage(replyToken, [
        { type: 'text', text: '新しい支出カテゴリ名を送信してください' },
      ])
      return
    }
  }
}

const handleTextMessage = (replyToken: string, text: string) => {
  const pending = takePendingInput()
  if (!pending) return
  const category = text.trim()
  if (!category) return
  applyCategory(replyToken, pending.pageId, pending.notifId, category)
}

/**
 * 支出カテゴリを Notion に反映し、確定通知の内訳を再送する
 */
const applyCategory = (
  replyToken: string,
  pageId: string,
  notifId: string,
  category: string,
) => {
  updateUsage(pageId, { category })

  const pageIds = loadNotification(notifId)
  if (pageIds.indexOf(pageId) < 0) pageIds.push(pageId)
  const entries = pageIds.map((id) => getUsage(id))

  sendReplyMessage(replyToken, [buildConfirmedListMessage(entries, notifId)])
}
