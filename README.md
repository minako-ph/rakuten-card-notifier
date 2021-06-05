# Usage

install packages
```bash
yarn install
typesync
```

login to clasp
```bash
yarn clasp login
```

update `.clasp.json`
```
{
  "scriptId":"", // add script ID
  "rootDir": "./dist"
}
```

or you can create new one
```bash
yarn clasp create
```

deploy as test
```bash
yarn deploy
```

よく使うgasのメソッド
```js
 // 環境変数の取得
 const prop = PropertiesService.getScriptProperties().getProperties()
 const token = prop.TOKEN

 // シートの取得など
 const sheet = SpreadsheetApp.openById('id');
 sheet.getSheetByName('name')
 sheet.getSheetByName('name').getRange(2,3).getValue(); // getRange(縦, 横)
 sheet.getSheetByName('name').getRange(2,3).setValue('value');
```

# Run script from local machine

- [Clasp doc](https://github.com/google/clasp/blob/master/docs/run.md)  
- [参考記事](https://qiita.com/jiroshin/items/dcc398285c652554e66a#%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E3%81%8B%E3%82%89gas%E3%82%92%E5%8F%A9%E3%81%8F)
