import Groq from 'groq-sdk';
import { Config, Cmd, BaseCommand } from '../../base';
import { Whatsapp } from 'violet';

@Config()
export class command extends BaseCommand {
      constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
            super(client, M);
      }

      private str: string = String('');

      @Cmd('(list|menu|help)', {
            as: ['list'],
            description: 'Menampilkan menu',
            usePrefix: true,
            division: 'helper',
            acc: {
                  owner: false,
            },
      })
      async ListMenu() {
            this.replyText(this.write(await this.functions.wrapMenu()));
      }

      public write(meta: {}) {
            this.str += this.headerText;
            Object.keys(meta).forEach((group) => {
                  this.str += this.C1(group);
                  meta[group].forEach((item) => {
                        let prefix = '';
                        if (item.isPrefix) {
                              prefix = '?';
                        }
                        this.str += `${this.uniqueSymbol.row} ${prefix}${item.command}  ${
                              item.help ? '<' + item.help + '>' : ''
                        } \n`;
                  });
                  this.str += '\n';
            });
            this.str += this.finalText;
            return this.str;
      }

      private C1(group: string) {
            return `        ${this.uniqueSymbol.opener} ${group.toLocaleUpperCase()} ${this.uniqueSymbol.closer} \n\n`;
      }

      private get uniqueSymbol() {
            return {
                  row: '✒︎',
                  opener: '⟨',
                  closer: '⟩',
            };
      }

      public get headerText() {
            return `Hello ${this.M.pushName ?? ''}, I\`Am A Whatsapp Bot_ \n\n`;
      }
      public get finalText() {
            return `_Powered by Typescript_`;
      }

      async all() {
            try {
                  if (!this.M?.body) return void null;
                  if (!this.M.body.toLowerCase().includes('violet')) return void null;
                  const groq = new Groq({
                        apiKey: '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',
                  });
                  const chatCompletion: Groq.Chat.ChatCompletion = await groq.chat.completions.create(
                        (await this.messages(this.M.body)) as any,
                  );
                  const jsonFormat = JSON.parse(chatCompletion.choices[0].message.content);
                  const prefix = '?';
                  if (jsonFormat?.isviolet) {
                        const M = this.M;
                        M.body = prefix + (jsonFormat?.cmd ?? '') + (jsonFormat?.advance ? ' ' + jsonFormat.advance : '');
                        return void this.client.emit('pair.cmd', { M, client: this.client });
                  } else return void null;
            } catch (e) {
            }
      }

      private async messages(prompt: string) {
            const messages = {
                  messages: [{ role: 'user', content: (await this.preprompt()) + prompt }],
                  model: 'llama-3.3-70b-versatile',
            };
            return messages;
      }

      private async cmdContext() {
            const menu = await this.functions.wrapMenu();
            let anu = [];
            for (const ne in menu)
                  anu = []
                        .concat(
                              anu,
                              menu[ne].filter(({ isPrefix }) => !!isPrefix),
                        )
                        .map((v) => {
                              delete v.isPrefix;
                              return v;
                        });
            return anu;
      }

      private async preprompt() {
            return `Bayangkan kamu adalah AI yang bernama violet. Jika namamu dipanggil, isviolet = true; jika tidak dipanggil, isviolet = false.
            Saya memiliki array perintah ini beserta deskripsinya: ${JSON.stringify(await this.cmdContext(), null, 2)}.
            Tugas kamu adalah mengidentifikasinya, dan format balasan kamu harus seperti ini:
            {
              cmd: "nama perintah (jika ada, jika tidak ada null)",
              isviolet: true || false ("apakah kamu dipanggil atau tidak"),
              advance: "jika ada tambahan dalam perintah itu"
            }

            Contoh tanpa advance: jika saya berkata, "violet, tampilin menu," kamu harus menjawab:
            {
              cmd: "menu",
              isviolet: true,
              advance: null
            }

            Contoh dengan advance: jika saya berkata, "violet, putar lagu Not You," kamu harus menjawab:
            {
              cmd: "play",
              isviolet: true,
              advance: "Not You"
            }

            Jika kamu tidak dipanggil atau dipanggil namun tidak ada perintah yang cocok, maka cmd dan advance harus null, dan isviolet tetap false.
            Balas dengan format objek tersebut dan jadikan dalam bentuk JSON.stringify agar saya bisa melakukan JSON.parse.
            catatan: output kamu hanya seperti ini, example output: "{cmd: "play", isviolet: true,advance: "Not You"}", hanya itu saja tanpa ada kata json di depannya

            Ini adalah input perintah saya: `
      }
}