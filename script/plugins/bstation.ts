import Axios, { AxiosHeaders } from 'axios';

interface AnimeTypes {
      title: string;
      season_id: string;
      highlights: AnimeHighlight[];
      cover: string;
      view: string;
      season_type: string;
      season_type_enum: number;
      styles: AnimeStyle[];
      description: string;
      pay_policy_enum: number;
      content_rating: number;
      update_pattern: string;
      label: number;
      index_show: string;
}

interface AnimeHighlight {
      str: string;
      match: boolean;
}

interface AnimeStyle {
      id: number;
      title: string;
      qs: string;
}

export class Bstation {
      protected headers = () => ({
            Host: 'api.unpai.red',
            Connection: 'keep-alive',
            'User-Agent':
                  'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36',
            Accept: '*/*',
            Origin: 'https://www.bilibili.tv',
            'X-Requested-With': 'com.nusanime.app',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            Referer: 'https://www.bilibili.tv/',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      });

      public instance = Axios.create({
            baseURL: 'https://api.unpai.red',
            headers: this.headers(),
      });

      protected async getRequest<T extends object>(path: string): Promise<T> {
            return new Promise<T>(
                  async (res, err) =>
                        await this.instance
                              .get(path)
                              .then(({ data }) => res(data.data?.items))
                              .catch((e) => err(e.response.data)),
            );
      }

      protected async searchNime(query: string) {
            const request = await this.getRequest<Partial<AnimeTypes>[]>(
                  '/search/result-anime/' + query.replace(/ +/, '+'),
            );
            if (!request) throw `Searches for ${query} are not found in bstation`;
            return request.map((anime) =>
                  Object.freeze(
                        Object.assign({}, anime, { cover: 'https://player.ngewibu.tv/?q=im&g=' + anime.cover }),
                  ),
            );
      }

      protected objectMap(json: any, arr: Array<any>) {
            let result = {};
            arr.forEach((item) => {
                  if (typeof item === 'string') {
                        let key = item;
                        let value = json[key];
                        result[key] = value;
                  } else {
                        let key = item[0];
                        let value = item[1];
                        let keySplit = key.split('.');
                        let temp = json;
                        keySplit.forEach((item) => {
                              temp = temp[item];
                        });
                        result[value] = temp;
                  }
            });
            return result;
      }
}
