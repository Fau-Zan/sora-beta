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
      /* let { tag, from, group } = proto;
      const server1 = jidDecode(tag);
      const server2 = from ? jidDecode(from) : undefined;
      return void this.sock.sendMessage(group.id, {
            text: `@${server2?.user ? server2.user + ' reign' : ''} @${server1?.user} tagging all`,
            mentions: [from, tag],
      });*/
};
