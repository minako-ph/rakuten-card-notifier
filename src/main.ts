import { getColumnIndexMap, appendRow } from './spreadsheet';
import { sendPushMessage } from './line';

const LABEL_NAME = '通知処理済み';

/**
 * メール処理のメインロジック
 */
export const processEmails = () => {
  // 速報版と確定版のメールをそれぞれ検索
  const notificationThreads = GmailApp.search(
    `from:(@mail.rakuten-card.co.jp) after:2025/01/01 subject:【速報版】カード利用のお知らせ(本人ご利用分) -label:${LABEL_NAME}`
  );

  const confirmedThreads = GmailApp.search(
    `from:(@mail.rakuten-card.co.jp) after:2025/01/01 subject:カード利用のお知らせ(本人ご利用分) -label:${LABEL_NAME}`
  );

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('利用履歴');
  if (!sheet) throw new Error('Sheet not found');

  const indexMap = getColumnIndexMap(sheet);

  const newEntries: any[] = [];
  const updatedEntries: any[] = [];

  // 速報版メールの処理
  notificationThreads.forEach((thread) => {
    // メッセージを取得し、古い順にソート
    const messages = thread.getMessages().sort((a, b) => a.getDate().getTime() - b.getDate().getTime());
    messages.forEach((message) => {
      const body = message.getPlainBody();
      const date = extractDate(body);
      const amount = extractAmount(body);

      newEntries.push({ date, amount });
      appendRow(sheet, [date, '', amount]);
    });

    // スレッドにラベルを追加
    thread.addLabel(GmailApp.getUserLabelByName(LABEL_NAME));
  });

// 確定版メールの処理
  confirmedThreads.forEach((thread) => {
    // メッセージを取得し、古い順にソート
    const messages = thread.getMessages().sort((a, b) => a.getDate().getTime() - b.getDate().getTime());
    messages.forEach((message) => {
      const body = message.getPlainBody();
      const date = extractDate(body);
      const amount = extractAmount(body);
      const place = extractPlace(body);

      const updated = updateConfirmedRow(sheet, date, amount, place, indexMap);
      if (updated) {
        updatedEntries.push({ date, amount, place });
      } else {
        newEntries.push({ date, amount, place });
        appendRow(sheet, [date, place, amount]);
      }
    });

    // スレッドにラベルを追加
    thread.addLabel(GmailApp.getUserLabelByName(LABEL_NAME));
  });



  const totalAmount = calculateTotal(sheet, indexMap);
  sendNotificationToLine(newEntries, updatedEntries, totalAmount);
};

/**
 * メール本文から利用日を抽出
 */
const extractDate = (body: string): string => {
  const match = body.match(/利用日:\s*(\d{4}\/\d{2}\/\d{2})/);
  return match ? match[1] : '';
};

/**
 * メール本文から利用金額を抽出
 */
const extractAmount = (body: string): string => {
  const match = body.match(/利用金額:\s*([\d,]+)/);
  return match ? match[1] + '円' : '';
};

/**
 * メール本文から利用先を抽出
 * ※利用先の正確な抽出が困難なため、該当部分を確認して改良の余地があります
 */
const extractPlace = (body: string): string => {
  const match = body.match(/利用先:\s*(.+)/);
  return match ? match[1] : '未特定';
};


/**
 * 確定版メールでスプレッドシートを更新
 */
const updateConfirmedRow = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  date: string,
  amount: string,
  place: string,
  indexMap: Record<string, number>
): boolean => {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][indexMap['利用日']] === date && data[i][indexMap['利用金額']] === amount && !data[i][indexMap['利用先']]) {
      sheet.getRange(i + 1, indexMap['利用先'] + 1).setValue(place);
      return true;
    }
  }
  return false;
};

/**
 * スプレッドシートから今月の利用金額合計を計算
 */
const calculateTotal = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  indexMap: Record<string, number>
): number => {
  const data = sheet.getDataRange().getValues();
  const currentMonth = new Date().getMonth() + 1;
  return data.slice(1).reduce((sum, row) => {
    const date = new Date(row[indexMap['利用日']]);
    if (date.getMonth() + 1 === currentMonth) {
      const amount = parseInt(row[indexMap['利用金額']].replace(/,/g, '').replace('円', ''), 10);
      return sum + amount;
    }
    return sum;
  }, 0);
};

/**
 * LINE通知を送信
 */
const sendNotificationToLine = (newEntries: any[], updatedEntries: any[], totalAmount: number) => {
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
          contents: newEntries.map((entry) => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: entry.date },
              { type: 'text', text: `${entry.amount} 円`, align: 'end' },
            ],
          })),
        },
        {
          type: 'text',
          text: '今月の利用金額合計',
          margin: 'xxl',
          weight: 'bold',
        },
        {
          type: 'text',
          text: `${totalAmount} 円`,
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
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '30万円の場合', margin: 'sm', weight: 'bold', size: 'sm' },
                { type: 'text', text: `${Math.round((totalAmount / 300000) * 100)}% 消化済み`, align: 'end' },
              ],
            },
            { type: 'text', text: `残 ${300000 - totalAmount} 円`, align: 'end' },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '40万円の場合', margin: 'sm', weight: 'bold', size: 'sm' },
                { type: 'text', text: `${Math.round((totalAmount / 400000) * 100)}% 消化済み`, align: 'end' },
              ],
            },
            { type: 'text', text: `残 ${400000 - totalAmount} 円`, align: 'end' },
          ],
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
          contents: updatedEntries.map((entry) => ({
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: entry.date },
                  { type: 'text', text: `${entry.amount} 円`, align: 'end' },
                ],
              },
              { type: 'text', text: entry.place },
            ],
          })),
        },
      ],
    },
  };

  const messages = [
    {
      type: 'flex',
      altText: '楽天カード利用通知',
      contents: flexContents,
    },
  ];
  sendPushMessage(messages);
};
