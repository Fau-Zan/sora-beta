import { Config, Cmd, BaseCommand } from '../../base';
import { WAMessage } from '@whiskeysockets/baileys';
import y2mate, { type Track } from '../../plugins/youtube';

@Config()
export class command extends BaseCommand {
      private ext: 'mp3' | 'mp4';
      @Cmd('(ytmp3|ytmp4)', {
            as: ['ytmp4', 'ytmp3'],
            description: 'download video dari link youtube (mp3/mp4)',
            usePrefix: true,
            division: 'download',
            acc: {
                  owner: false,
            },
      })
      public async youtube() {
            try {
                  if (/ytmp4/.test(this.cmd)) this.ext = 'mp4';
                  else this.ext = 'mp3';
                  if (!this.isText(this.query.parsed)) {
                        throw 'Invalid query as text';
                  }
                  if (!this.YTRegex.test(this.query.parsed)) {
                        throw 'YouTube URL tidak valid. Gunakan format: https://youtube.com/watch?v=... atau https://youtu.be/...';
                  }
                  await this.replyText(`Mengunduh video dalam format *${this.ext.toUpperCase()}*...\n\nMohon tunggu, proses ini membutuhkan waktu beberapa detik.`);
                  this.downloadFromURI(this.query.parsed, this.ext, async (res) => {
                        try {
                              const caption = `
✅ *Download Berhasil*

📽️ Judul: ${res.filename}
👤 Author: ${res.author || 'Unknown'}
⏱️ Durasi: ${res.duration || 'N/A'}
📥 Format: ${this.ext.toUpperCase()}
`.trim();

                              if (this.ext === 'mp4') {
                                    await this.client.sendVideo(this.M.from, res.url, {
                                          quoted: this.M as WAMessage,
                                          caption,
                                    });
                              } else {
                                    await this.client.sendMessage<'audioMessage'>(
                                          this.M.from,
                                          res.url,
                                          'audioMessage',
                                          {
                                                quoted: this.M as WAMessage,
                                                mimetype: 'audio/mpeg',
                                          }
                                    );
                              }
                        } catch (sendError: any) {
                              await this.replyText(`❌ Error saat mengirim file: ${sendError.message}`);
                        }
                  });
            } catch (error: any) {
                  await this.replyText(`❌ Error: ${error.message || error}`);
            }
      }

      /**
       * Validasi string input.
       * @private
       */
      public isText(body?: string) {
            return typeof body === 'string' && body.trim().length > 0;
      }

      /**
       * Regex untuk validasi YouTube URL.
       * @private
       */
      get YTRegex() {
            return /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      }

      /**
       * Download dari YouTube URL menggunakan y2mate plugin.
       * @private
       * @param url YouTube URL
       * @param ext Format (mp3 atau mp4)
       * @param callback Handler setelah download selesai
       */
      public downloadFromURI(
            url: string,
            ext: 'mp3' | 'mp4',
            callback?: (res: Track) => Promise<void>
      ) {
            y2mate(url, ext)
                  .then(async (hasil) => {
                        if (callback) {
                              await callback(hasil);
                        }
                  })
                  .catch((error) => {
                        this.replyText(`❌ Download gagal: ${error.message}`);
                  });
      }
}

