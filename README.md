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
`Create which script? ` で `sheets` を選択

6. root directoryに作成された `appscript.json`を削除

7. add the following to .clasp.json:
```
{
  "scriptId":"xxxxxxxxxxxxx",
  "rootDir": "./dist" // !! Add this line !!
}
```

8. Google Spreadsheetを開き一枚目のシートの名前を「利用履歴」に変更する

10. Googleメールに「通知処理済み」というラベルを作成する

11. LINEのダッシュボードから諸々の設定をする（割愛、詳細は聞いてください）

12. GASの設定から`CHANNEL_ACCESS_TOKEN`と`USER_ID`を埋める

13. ソースコードの反映
```bash
yarn push
```

14. 時間指定で実行するトリガーを設定する
