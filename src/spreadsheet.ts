export const columnHeaders = ['利用日', '利用先', '利用金額'];

/**
 * スプレッドシートの列インデックスを取得
 * @param sheet 対象スプレッドシート
 */
export const getColumnIndexMap = (sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return columnHeaders.reduce((map, header, index) => {
    map[header] = headers.indexOf(header);
    return map;
  }, {} as Record<string, number>);
};

/**
 * 新しい行をスプレッドシートに追加
 * @param sheet 対象スプレッドシート
 * @param row データ行
 */
export const appendRow = (sheet: GoogleAppsScript.Spreadsheet.Sheet, row: string[]) => {
  sheet.appendRow(row);
};
