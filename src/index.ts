import { processEmails, sample } from './main'

declare const global: {
  [x: string]: unknown
}

global.main = processEmails
global.sample = sample
