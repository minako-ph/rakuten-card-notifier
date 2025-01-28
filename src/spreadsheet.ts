export const columnHeaders = ['利用日', '利用先', '利用金額'] as const

/**
 * スプレッドシートの列インデックスを取得
 * @param sheet 対象スプレッドシート
 */
type ColumnHeader = (typeof columnHeaders)[number]
// ヘッダーの情報と列数のマッピング
type ColumnHeaderIndexMap = Record<ColumnHeader, number>
// 定義されているヘッダー情報と一致するか
const isColumnHeader = (item: string): item is ColumnHeader => {
  return columnHeaders.some((type) => type === item)
}

/**
 * シートのヘッダーの列数情報を取得
 * NOTE: どのヘッダーが何列目にあるのかを取得する
 * @param sheet
 */
export const getColumnIndexMap = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
): ColumnHeaderIndexMap => {
  const headerValues: string[] = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]

  // 列数情報を作成
  return headerValues.reduce<ColumnHeaderIndexMap>((acc, item, index) => {
    if (isColumnHeader(item)) {
      acc[item] = index
    }
    return acc
  }, {} as ColumnHeaderIndexMap)
}

/**
 * 新しい行をスプレッドシートに追加
 * @param sheet 対象スプレッドシート
 * @param row データ行
 */
export const appendRow = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: string[],
) => {
  sheet.appendRow(row)
}
