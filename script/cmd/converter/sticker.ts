import { Config, Cmd, BaseCommand } from '../../base';
import { type IStickerOptions, StickerTypes, Sticker } from 'wa-sticker-formatter';

@Config()
export class command extends BaseCommand {
      private get stickerOptions(): Partial<IStickerOptions> {
            return {
                  pack: 'violet',
                  author: 'Fauzan',
                  type: StickerTypes.FULL,
                  quality: 10,
            };
      }

      @Cmd('(sticker|stc)', {
            as: ['sticker'],
            division: 'convert',
            description: 'mengubah gambar menjadi sticker',
            usePrefix: true,
            acc: {
                  response: true,
                  owner: false,
            },
      })
      public async defaultExecutor(): Promise<void> {
            if (!this.isImage()) throw 'input must be a image';

            const { build } = await this.writeSticker();
            this.client.sendSticker(this.M.from, await build(), {
                  quoted: this.M,
            });
      }

      public async writeSticker() {
            return new Sticker(
                  this.M?.quoted ? await this.M.quoted.download('buffer') : await this.M.downloadMediaMsg('buffer'),
                  this.stickerOptions,
            );
      }
}
