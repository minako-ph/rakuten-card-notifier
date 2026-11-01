import { UsageEntry } from './notion'
import { buildPostbackData } from './postback'

export type NotificationEntry = {
  /** yyyy-MM-dd */
  date: string
  amount: number
}

const formatDate = (isoDate: string) => isoDate.replace(/-/g, '/')
const formatAmount = (amount: number) => `${Number(amount).toLocaleString()} 円`

type LabelStyle = {
  background: string
  color: string
  border?: string
}

// 角のないラベルの配色
const LABEL_STYLE = {
  unselected: { background: '#E6E6E6', color: '#555555' },
  selected: { background: '#2E6B5E', color: '#FFFFFF' },
  add: { background: '#FFFFFF', color: '#2E6B5E', border: '#2E6B5E' },
}

/**
 * 角のないラベル風の UI 部品
 * @param flex 0 なら文字幅、1 以上なら横に広がる
 */
const label = (text: string, style: LabelStyle, action?: object, flex = 0) => {
  const box: Record<string, unknown> = {
    type: 'box',
    layout: 'vertical',
    flex,
    backgroundColor: style.background,
    cornerRadius: 'none',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingStart: '10px',
    paddingEnd: '10px',
    contents: [
      {
        type: 'text',
        text,
        size: 'xs',
        color: style.color,
        align: 'center',
        wrap: true,
      },
    ],
  }
  if (style.border) {
    box.borderWidth = '1px'
    box.borderColor = style.border
  }
  if (action) box.action = action
  return box
}

/**
 * 確定通知の各明細右側に置く支出カテゴリのラベル（ボタン）
 * 未選択なら「カテゴリ」、選択済みならカテゴリ名を表示する。どちらもタップで選び直せる
 */
const categoryLabel = (entry: UsageEntry, notifId: string) =>
  label(
    entry.category || 'カテゴリ',
    entry.category ? LABEL_STYLE.selected : LABEL_STYLE.unselected,
    {
      type: 'postback',
      label: 'カテゴリ',
      data: buildPostbackData({
        action: 'pick',
        pageId: entry.pageId,
        notifId,
      }),
    },
  )

/**
 * 確定通知の明細 1 行
 */
const confirmedRow = (entry: UsageEntry, notifId: string) => ({
  type: 'box',
  layout: 'horizontal',
  alignItems: 'center',
  spacing: 'md',
  contents: [
    {
      type: 'box',
      layout: 'vertical',
      flex: 1,
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: formatDate(entry.date) },
            { type: 'text', text: formatAmount(entry.amount), align: 'end' },
          ],
        },
        {
          type: 'text',
          text: entry.place || '-',
          align: 'end',
          size: 'sm',
          color: '#888888',
          wrap: true,
        },
      ],
    },
    categoryLabel(entry, notifId),
  ],
})

const confirmedList = (entries: UsageEntry[], notifId: string) => ({
  type: 'box',
  layout: 'vertical',
  contents: entries.map((entry) => confirmedRow(entry, notifId)),
  margin: 'sm',
  spacing: 'md',
})

const flexMessage = (altText: string, bubble: object) => ({
  type: 'flex',
  altText,
  contents: bubble,
})

/**
 * 利用金額通知（速報・合計・消化率・確定）のメッセージ
 */
export const buildNotificationMessage = (
  notificationEntries: NotificationEntry[],
  confirmedEntries: UsageEntry[],
  totalAmount: number,
  notifId: string,
) => {
  const bubble = {
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
              { type: 'text', text: formatDate(entry.date) },
              { type: 'text', text: formatAmount(entry.amount), align: 'end' },
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
          text: formatAmount(totalAmount),
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
                      text: `${Math.round((totalAmount / 200000) * 100).toLocaleString()}% 消化済み`,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: `残 ${(200000 - totalAmount).toLocaleString()} 円`,
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
        confirmedList(confirmedEntries, notifId),
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xxl',
          contents: [
            label(
              'カテゴリ別の内訳を見る',
              LABEL_STYLE.add,
              {
                type: 'postback',
                label: 'カテゴリ別の内訳',
                data: buildPostbackData({ action: 'breakdown' }),
              },
              1,
            ),
          ],
        },
      ],
    },
  }
  return flexMessage('楽天カード利用通知', bubble)
}

export type CategoryBreakdown = {
  category: string
  total: number
  entries: UsageEntry[]
}

/**
 * 今月分のカテゴリ別内訳のメッセージ
 * @param monthLabel 見出しに出す月（例: 11月）
 * @param breakdown 合計金額の大きい順に並んだカテゴリ別の明細
 */
export const buildBreakdownMessage = (
  monthLabel: string,
  breakdown: CategoryBreakdown[],
  totalAmount: number,
) => {
  const sections: object[] = breakdown.map((group) => ({
    type: 'box',
    layout: 'vertical',
    margin: 'xl',
    spacing: 'sm',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        alignItems: 'center',
        contents: [
          label(group.category, LABEL_STYLE.selected),
          {
            type: 'text',
            text: formatAmount(group.total),
            align: 'end',
            weight: 'bold',
          },
        ],
      },
      ...group.entries.map((entry) => ({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: entry.place || '-',
            size: 'sm',
            flex: 3,
            wrap: true,
          },
          {
            type: 'text',
            text: formatAmount(entry.amount),
            size: 'sm',
            align: 'end',
            flex: 2,
          },
          {
            type: 'text',
            text: entry.date.slice(5).replace(/-/g, '/'),
            size: 'xs',
            color: '#888888',
            align: 'end',
            flex: 1,
          },
        ],
      })),
    ],
  }))

  if (sections.length === 0) {
    sections.push({
      type: 'text',
      text: '今月の利用明細はありません',
      margin: 'xl',
      color: '#888888',
    })
  }

  const bubble = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `${monthLabel}のカテゴリ別内訳`,
          weight: 'bold',
          size: 'md',
          margin: 'none',
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: '合計', size: 'sm' },
            {
              type: 'text',
              text: formatAmount(totalAmount),
              align: 'end',
              size: 'sm',
            },
          ],
        },
        {
          type: 'separator',
          margin: 'xl',
        },
        ...sections,
      ],
    },
  }
  return flexMessage(`${monthLabel}のカテゴリ別内訳`, bubble)
}

/**
 * 支出カテゴリ更新後に再送する確定通知のメッセージ
 */
export const buildConfirmedListMessage = (
  confirmedEntries: UsageEntry[],
  notifId: string,
) => {
  const bubble = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '確定通知（支出カテゴリ更新）',
          weight: 'bold',
          size: 'md',
          margin: 'none',
        },
        {
          type: 'separator',
          margin: 'xxl',
        },
        confirmedList(confirmedEntries, notifId),
      ],
    },
  }
  return flexMessage('支出カテゴリを更新しました', bubble)
}

/**
 * 支出カテゴリ選択のメッセージ
 * 既存の選択肢を 2 列のラベルで並べ、末尾に「新規入力」を置く
 */
export const buildCategoryPickerMessage = (
  entry: UsageEntry,
  options: string[],
  notifId: string,
) => {
  const rows: object[] = []
  for (let i = 0; i < options.length; i += 2) {
    const pair = options.slice(i, i + 2)
    rows.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: pair.map((option) =>
        label(
          option,
          option === entry.category
            ? LABEL_STYLE.selected
            : LABEL_STYLE.unselected,
          {
            type: 'postback',
            label: option,
            displayText: option,
            data: buildPostbackData({
              action: 'set',
              pageId: entry.pageId,
              notifId,
              category: option,
            }),
          },
          1,
        ),
      ),
    })
  }

  const bubble = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '支出カテゴリを選択',
          weight: 'bold',
          size: 'md',
          margin: 'none',
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: formatDate(entry.date), size: 'sm' },
            {
              type: 'text',
              text: formatAmount(entry.amount),
              align: 'end',
              size: 'sm',
            },
          ],
        },
        {
          type: 'text',
          text: entry.place || '-',
          align: 'end',
          size: 'sm',
          color: '#888888',
          wrap: true,
        },
        {
          type: 'separator',
          margin: 'xl',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'xl',
          spacing: 'sm',
          contents: rows,
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          contents: [
            label(
              '＋ 支出カテゴリを新規入力する',
              LABEL_STYLE.add,
              {
                type: 'postback',
                label: '新規入力',
                data: buildPostbackData({
                  action: 'new',
                  pageId: entry.pageId,
                  notifId,
                }),
              },
              1,
            ),
          ],
        },
      ],
    },
  }

  return flexMessage('支出カテゴリを選択してください', bubble)
}
