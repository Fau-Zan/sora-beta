import { proto } from '@whiskeysockets/baileys';

export function Reaction(react: { key: proto.IMessageKey; reaction: proto.IReaction; operation: 'add' | 'remove' }) {}
