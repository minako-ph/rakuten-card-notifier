import { sendPushMessage } from './line'

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
