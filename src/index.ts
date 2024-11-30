import { triggerFunction } from "./main";

declare const global: {
  [x: string]: unknown;
};

global.triggerFunction = triggerFunction;
