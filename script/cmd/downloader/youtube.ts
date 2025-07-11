import { Config, Cmd, BaseCommand } from '../../base';
import y2mate, { type Track } from '../../plugins/youtube';

@Config()
export class command extends BaseCommand {
      private ext: 'mp3' | 'mp4';
      @Cmd('(ytmp3|ytmp4)', {
            as: ['ytmp4', 'ytmp3'],
            description: 'download video dari link youtube',
            usePrefix: true,
            division: 'download',
            acc: {
                  owner: false,
            },
      })
      public async youtube() {
            if (/ytmp4/.test(this.cmd)) this.ext = 'mp4';
            else this.ext = 'mp3';
            if (!this.isText(this.query.parsed)) {
                  throw 'Invalid query as text';
            }
            if (!this.YTRegex.test(this.query.parsed)) {
                  throw 'Youtube url is invalid';
            }
            if (await this.replyText('Please wait, your request is being processed'))
                  this.downloadFromURI(this.query.parsed, this.ext, (res) => {
                        const res_url = res.url;
                        return void (this.ext == 'mp4'
                              ? this.client.sendVideo(this.M.from, res_url, { quoted: this.M })
                              : this.client.sendMessage<'audioMessage'>(this.M.from, res_url, 'audioMessage', {
                                      quoted: this.M,
                                      mimetype: 'audio/mpeg',
                                }));
                  });
      }

      public isText(body?: string) {
            return typeof body === 'string';
      }

      get YTRegex() {
            return /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})\W/;
      }

      public downloadFromURI(url: string, ext: 'mp3' | 'mp4', callback?: (res: Track) => Promise<void>) {
            y2mate(this.getYoutubeId(url), ext).then((hasil) => callback(hasil));
      }

      private getYoutubeId(url: string) {
            const regex =
                  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/im;
            const match = url.match(regex);
            return match && match[1] ? match[1] : null;
      }
}
