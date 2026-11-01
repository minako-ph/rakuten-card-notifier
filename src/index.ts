import { processEmails } from './main'
import { sample } from './sample'
import { doPost } from './webhook'

declare const global: {
  [x: string]: unknown
}

global.main = processEmails
global.sample = sample
global.doPost = doPost
