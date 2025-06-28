import axios from 'axios';

const headers1 = {
      Authorization: 'license 94276a8902cb41f1',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LALALAI/1.0.2.80 (android-armv7)',
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate',
};

const headers = {
      Authorization: 'license 94276a8902cb41f1',
      'User-Agent': 'LALALAI/1.0.2.80 (android-armv7)',
      Accept: '*/*',
};

export const generateInstrument = async (buffer: Buffer) => {
      const filename = 'AUD-' + Date.now() + '.mp3';
      headers['Content-Disposition'] = "attachment; filename*=utf-8''" + filename;
      headers['Content-Length'] = buffer.byteLength.toString();

      const instance = axios.create({ baseURL: 'https://www.lalal.ai/api' });
      const response1 = await instance.post('/upload/', buffer, { headers }).catch((e) => e.response);
      const { id } = response1.data;

      const response2 = await instance
            .post('/split/', 'id=' + id + '&filter=1&stem=vocals&splitter=phoenix', { headers: headers1 })
            .catch((e) => e.response);
      const split = response2.data;

      const check = async () => {
            const response3 = await instance
                  .post('/check/', 'id=' + id, { headers: headers1 })
                  .catch((e) => e.response);
            const data = response3.data;
            return data.result?.[id].split;
      };
      if (split.status === 'success') return (await check()) as IVocals;
      else return undefined;
};

export interface IVocals {
      status: string;
      result: {
            [K: string]: {
                  status: string;
                  name: string;
                  size: number;
                  duration: number;
                  stem: string;
                  splitter: string;
                  preview: string | null;
                  split: {
                        stem: string;
                        duration: number;
                        stem_track: string;
                        stem_track_size: number;
                        back_track: string;
                        back_track_size: number;
                  };
                  player: string | null;
                  task: {
                        id: string[];
                        state: string;
                        progress: number;
                        split_id: string;
                  };
            };
      };
      archive: {
            url: string;
            size: number;
      };
      batch: {
            url: string;
            size: number;
      };
}
