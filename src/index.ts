import { processEmails } from './main'
import { sample } from './sample'
import { doPost } from './webhook'
import { migrateFromSpreadsheet } from './migrate'

declare const global: {
  [x: string]: unknown
}

global.main = processEmails
global.sample = sample
global.doPost = doPost
global.migrate = migrateFromSpreadsheet
