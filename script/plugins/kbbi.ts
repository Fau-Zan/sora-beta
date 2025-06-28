//Sources: https://github.com/tfkhdyt/kbbi-bot/blob/main/src/Scraper.ts

import Axios from 'axios';
import { load, CheerioAPI } from 'cheerio';

export interface IPengertian {
      jenisKata: string[];
      deskripsi: string;
}

export class Kbbi {
      private ejaan: string[] = [];
      private kataTidakBaku?: string = undefined;
      private prakategorial?: string = undefined;
      private pengertian: IPengertian[] = [];
      private $: CheerioAPI;
      private word: string;

      constructor(word: string) {
            this.word = word;
      }

      private checkNotFound() {
            const notFound = this.$('h4').text();
            if (notFound.includes('Entri tidak ditemukan')) throw new Error('Entri tidak ditemukan');
      }

      private async scrapeData() {
            const { data: html } = await Axios.get(
                  'https://kbbi.kemdikbud.go.id/entri/' + this.word.toLowerCase().trim(),
            );
            this.$ = load(html);
            this.checkNotFound();

            this.prakategorial ??= this.$('font[title="prakategorial: kata tidak dipakai dalam bentuk dasarnya"]')
                  .next()
                  .text() as string;

            this.$('h2').each((_, element) => {
                  const hasil = this.$(element);

                  this.kataTidakBaku ??= hasil.find('small').text().replace(/[0-9]/g, '');

                  hasil.find('small').remove();
                  this.ejaan = hasil
                        .text()
                        .split(' ')
                        .filter(Boolean)
                        .map((value) => value.replace(/[0-9]/g, ''));

                  hasil.siblings('ul.adjusted-par,ol')
                        .children()
                        .each((_, el) => {
                              const info: IPengertian = {
                                    jenisKata: [],
                                    deskripsi: '',
                              };

                              info.jenisKata = this.$(el)
                                    .find('font[color=red] span')
                                    .map((_, el) => this.$(el).attr('title'))
                                    .toArray();

                              this.$(el).find('font[color=red]').remove();
                              info.deskripsi = this.$(el).text();

                              if (info.deskripsi.includes('?')) {
                                    info.deskripsi.replace(/[0-9]/g, '');
                              }

                              if (this.pengertian.find((value) => value.deskripsi === info.deskripsi)) return;

                              this.pengertian.push(info);
                        });
            });
      }

      async getData() {
            await this.scrapeData();
            return {
                  ejaan: this.ejaan,
                  kataTidakBaku: this.kataTidakBaku,
                  pengertian: this.pengertian,
                  prakategorial: this.prakategorial,
            };
      }
}
