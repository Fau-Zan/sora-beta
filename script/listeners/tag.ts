import { jidDecode } from '@whiskeysockets/baileys';
import { Events } from 'violet';

declare module 'violet' {
      namespace Events {
            interface MessageEvent {
                  'message.tag': (proto: {
                        group: {
                              id: string;
                              name: string;
                        };
                        from?: string;
                        tag: string;
                  }) => void;
            }
      }
}

export const Tag: Events.MessageEvent['message.tag'] = function tag(proto: {
      group: {
            id: string;
            name: string;
      };
      from?: string;
      tag: string;
}): void {

};
