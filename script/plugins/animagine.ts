import Axios, { AxiosError, AxiosResponse } from 'axios';

export class HuggingFace {
      headers = {
            Authorization: 'Bearer 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',
            'Content-Type': 'application/json; charset=UTF-8',
            Connection: 'Keep-Alive',
            'Accept-Encoding': 'gzip',
            'User-Agent': 'okhttp/4.10.0',
      };

      async animagine(inputs: string): Promise<Buffer> {
            const parameters = {
                  negative_prompt:
                        'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name',
                  height: 1216,
                  width: 832,
                  guidance_scale: 7,
                  num_inference_steps: 28,
            };

            const endpoint = '/models/cagliostrolab/animagine-xl-3.0';
            const response = await this.instance
                  .post<AxiosResponse<Buffer>>(endpoint, { parameters, inputs }, { responseType: 'arraybuffer' })
                  .catch((e: AxiosError) => e.response);
            return response.data as Buffer;
      }

      get instance() {
            const headers = this.headers;
            const url = 'https://api-inference.huggingface.co';

            return Axios.create({
                  baseURL: url,
                  headers: headers,
            });
      }
}
