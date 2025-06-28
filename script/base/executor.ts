import { WAProto } from '@whiskeysockets/baileys';
import type { Whatsapp as Wa } from 'violet';
import { functions } from '../utils';

enum MessType {
      text = 'conversation',
      image = 'imageMessage',
      video = 'videoMessage',
      audio = 'audioMessage',
      sticker = 'stickerMessage',
}
export class BaseCommand implements Wa.FollowUp, Wa.ExtraContents {
      constructor(client?: Wa.IClient, M?: Wa.IWaMess) {
            (this.client = client), (this.M = M);
      }

      public MessageMethod: typeof MessType = MessType;
      public client: Wa.IClient;
      public M: Wa.IWaMess;
      public setting: boolean;
      public modify: Wa.ExtraContents['modify'];
      public query: { full: string; parsed: string };
      public cmd: string;
      public args: string[];
      protected async after(): Promise<void> {}

      public async sendWait() {
            return await this.replyText('Please wait, your request is being processed');
      }

      public replyText = (content: string) => {
            return this.client.sendText(this.M.from, content, {
                  quoted: this.M,
            }) as Promise<WAProto.IWebMessageInfo>;
      };

      isImage(): boolean {
            let M: Wa.IMessage;
            if (this.M.quoted) M = this.M.quoted.content;
            else M = this.M;
            return M.type === 'imageMessage';
      }

      isVideo(): boolean {
            let M: Wa.IMessage;
            if (this.M.quoted) M = this.M.quoted.content;
            else M = this.M;
            return M.type === 'videoMessage';
      }

      isSticker(): boolean {
            let M: Wa.IMessage;
            if (this.M.quoted) M = this.M.quoted.content;
            else M = this.M;
            return M.type === 'stickerMessage';
      }

      isAudio(): boolean {
            let M: Wa.IMessage;
            if (this.M.quoted) M = this.M.quoted.content;
            else M = this.M;
            return M.type === 'audioMessage';
      }

      protected functions = functions;
}
