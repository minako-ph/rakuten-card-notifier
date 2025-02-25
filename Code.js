function openSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  Logger.log('Spreadsheet URL: ' + ss.getUrl())
}
