import { processEmails } from './main';

declare const global: {
  [x: string]: unknown;
};

global.main = processEmails;
