const prop = PropertiesService.getScriptProperties().getProperties()
const CHANNEL_ACCESS_TOKEN = prop.CHANNEL_ACCESS_TOKEN
export const USER_ID = prop.USER_ID

const post = (url: string, payload: object) => {
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    method: 'post',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  }
  const response = UrlFetchApp.fetch(url, options)
  const code = response.getResponseCode()
  if (code < 200 || code >= 300) {
    throw new Error(`LINE API error ${code}: ${response.getContentText()}`)
  }
  return response
}

/**
 * LINEへのプッシュメッセージ送信
 * @param messages メッセージ配列
 */
export const sendPushMessage = (messages: object[]) => {
  return post('https://api.line.me/v2/bot/message/push', {
    to: USER_ID,
    messages,
  })
}

/**
 * LINEへの応答メッセージ送信（Webhook イベントへの返信）
 * @param replyToken Webhook イベントの replyToken
 * @param messages メッセージ配列
 */
export const sendReplyMessage = (replyToken: string, messages: object[]) => {
  return post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages,
  })
}
