const prop = PropertiesService.getScriptProperties().getProperties();
const CHANNEL_ACCESS_TOKEN = prop.CHANNEL_ACCESS_TOKEN;
const USER_ID = prop.USER_ID;

/**
 * LINEへのプッシュメッセージ送信
 * @param messages メッセージ配列
 */
export const sendPushMessage = (messages: any[]) => {
  const ENDPOINT_URL = 'https://api.line.me/v2/bot/message/push';
  const options = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    method: 'post',
    payload: JSON.stringify({
      to: USER_ID,
      messages,
    }),
  };
  // @ts-ignore
  return UrlFetchApp.fetch(ENDPOINT_URL, options);
};
