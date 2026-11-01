import { sendPushMessage } from './line'
import { buildNotificationMessage } from './flex'

/**
 * 通知の見た目確認用（ダミーデータで送信する）
 * NOTE: カテゴリのラベルを押しても Notion 上に明細が無いためエラー応答になる
 */
export const sample = () => {
  const notificationEntries = [
    { date: '2025-01-22', amount: 3250 },
    { date: '2025-01-23', amount: 1610 },
  ]
  const confirmedEntries = [
    {
      pageId: 'sample-1',
      date: '2025-01-19',
      amount: 850,
      place: 'ｻﾝﾌﾟﾙｺﾝﾋﾞﾆ',
      category: '',
    },
    {
      pageId: 'sample-2',
      date: '2025-01-20',
      amount: 2310,
      place: 'ｻﾝﾌﾟﾙﾁｮｳｻﾞｲﾔｯｷｮｸ',
      category: '医療費',
    },
  ]

  sendPushMessage([
    buildNotificationMessage(
      notificationEntries,
      confirmedEntries,
      143235,
      'sample',
    ),
  ])
}
