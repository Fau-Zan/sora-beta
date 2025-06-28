import { Config, Cmd, BaseCommand } from '../../base';

@Config()
export class command extends BaseCommand {
      private ext: string;
      @Cmd('(tikmp4|tikmp3)', {
            as: ['tikmp4', 'tikmp3'],
            description: "download video dari link tiktok",
            usePrefix: true,
            division: 'download',
            acc: {
                  owner: false,
            },
      })
      public async Tiktok() {
            if (/tikmp4/.test(this.cmd)) this.ext = 'mp4';
            else this.ext = 'mp3';
            if (!this.isText(this.query.parsed)) {
                  throw 'Invalid query as text';
            }
            if (!this.tiktokRegex.test(this.query.parsed)) {
                  throw 'Tiktok url is invalid';
            }
            if (await this.replyText('Please wait, your request is being processed'))
                  this.getVideoID(this.query.parsed, (id: string) => {
                        const url = `https://www.tikwm.com/video/${
                              this.ext == 'mp4' ? 'media/play/' + id + '.' + this.ext : 'music/' + id + '.' + this.ext
                        }`;
                        return void (this.ext == 'mp4'
                              ? this.client.sendVideo(this.M.from, url, { quoted: this.M })
                              : this.client.sendMessage<'audioMessage'>(this.M.from, url, 'audioMessage', {
                                      quoted: this.M,
                                      mimetype: 'audio/mpeg',
                                }));
                  });
      }

      public isText(body?: string) {
            return typeof body === 'string';
      }

      get tiktokRegex() {
            return /https:\/\/(www\.)?tiktok\.com\/(@\w+\/video\/\d+)|t\/\w+\/(\?.*)?|vt\.tiktok\.com\/\w+\//;
      }

      public getVideoID(url: string, callback?: (id: string) => Promise<void>) {
            fetch(url, { redirect: 'manual' })
                  .then((res: Response) => {
                        let url = res.headers.get('location');
                        let data = url.split('/');
                        data.splice(0, 5);
                        callback(data[0].substring(0, 19));
                  })
                  .catch((err) => {
                        throw err;
                  });
      }
}