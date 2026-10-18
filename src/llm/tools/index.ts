import { acknowledge } from './acknowledge.js';
import { proceed } from './proceed.js';
import { sendMessage } from './send-message.js';
import { ToolSet } from '../tool-set.js';

export const ackTools = new ToolSet([acknowledge, proceed]);
export const replyTools = new ToolSet([sendMessage]);
