# rakuten-card-notifier

楽天カードの利用通知メール（速報版 / 確定版）を Gmail から拾って Notion データベースに記録し、LINE に利用金額通知を送る GAS スクリプト。

LINE の確定通知では各明細の右側に「カテゴリ」ラベルが付き、タップすると支出カテゴリを選択（または新規入力）して Notion に反映できる。

# Usage

1. Fork this repository by clicking the "Fork" button on the top right corner of this page.

2. install packages
```bash
yarn install
```

3. 以下のURLにアクセスし `Google Apps Script API` をONにする

https://script.google.com/home/usersettings

4. login to clasp
```bash
yarn clasp login
```

5. create a new project
```bash
yarn clasp create
```
`Create which script? ` で `standalone` を選択

6. root directoryに作成された `appscript.json`を削除

7. add the following to .clasp.json:
```
{
  "scriptId":"xxxxxxxxxxxxx",
  "rootDir": "./dist" // !! Add this line !!
}
```

8. Notion データベースを用意する（以下のプロパティ名・型で作成する）

| プロパティ名 | 型 |
| --- | --- |
| 利用先 | タイトル |
| 利用日 | 日付 |
| 利用金額 | 数値 |
| 支出カテゴリ | セレクト |

- https://www.notion.so/my-integrations でインテグレーションを作成し、Internal Integration Secret を控える
- データベースの `...` → `接続先` から作成したインテグレーションを接続する
- 支出カテゴリの選択肢は LINE から「新規入力」した際に自動で追加される（Notion 側で事前に作っておいてもよい）

9. Googleメールに「通知処理済み」というラベルを作成する

10. LINEのダッシュボードから諸々の設定をする（割愛、詳細は聞いてください）

11. GASの設定（プロジェクトの設定 → スクリプト プロパティ）に以下を埋める

| キー | 値 |
| --- | --- |
| `CHANNEL_ACCESS_TOKEN` | LINE Messaging API のチャネルアクセストークン |
| `USER_ID` | 通知先（自分）の LINE ユーザー ID |
| `NOTION_TOKEN` | Notion インテグレーションの Internal Integration Secret |
| `NOTION_DATABASE_ID` | Notion データベースの ID（例: `40b1b112088980d2870dcaae12a47d13`） |

12. ソースコードの反映
```bash
yarn push
```

13. 時間指定で `main` を実行するトリガーを設定する

14. LINE の Webhook（支出カテゴリ選択）を設定する

初回のみ Web アプリとしてデプロイする
```bash
yarn clasp deploy -d "line webhook"
```
GAS エディタの「デプロイ」→「デプロイを管理」で Web アプリの URL（`https://script.google.com/macros/s/xxxx/exec`）を控え、
[LINE Developers](https://developers.line.biz/console/) のチャネル → Messaging API 設定 → Webhook URL に貼り付けて「Webhook の利用」を ON にする。
（「応答メッセージ」は OFF にしておく）

> 初回デプロイ時に GAS から Gmail / 外部サービス接続 の権限承認を求められるので許可する。

以降、コードを更新したら既存のデプロイを更新する（Webhook URL は変わらない）
```bash
yarn deploy
```

# 支出カテゴリの操作

1. 確定通知の明細右側の「カテゴリ」ラベルをタップ
2. 返信される選択肢ラベルからカテゴリを選ぶ、または「＋ 支出カテゴリを新規入力する」をタップして次のメッセージでカテゴリ名を送信（10 分以内）
3. Notion に反映され、確定通知の内訳がカテゴリ名のラベル付きで再送される

LINE は送信済みメッセージを書き換えられないため、更新後の内訳は新しいメッセージとして再送される。
