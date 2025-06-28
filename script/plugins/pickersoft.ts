import axios from 'axios';
import { functions } from '../utils';

interface ImageData {
      success: boolean;
      status: number;
      id: string;
      key: string;
      path: string;
      nodeType: string;
      name: string;
      title: string | null;
      description: string | null;
      size: number;
      link: string;
      private: boolean;
      expires: string;
      downloads: number;
      maxDownloads: number;
      autoDelete: boolean;
      planId: number;
      screeningStatus: string;
      mimeType: string;
      created: string;
      modified: string;
}

interface Params {
      prompt: string;
      negative_prompt: string;
      styles: null;
      seed: number;
      subseed: number;
      subseed_strength: number;
      seed_resize_from_h: number;
      seed_resize_from_w: number;
      sampler_name: string;
      batch_size: number;
      n_iter: number;
      steps: number;
      cfg_scale: number;
      width: number;
      height: number;
      restore_faces: boolean;
      tiling: boolean;
      do_not_save_samples: boolean;
      do_not_save_grid: boolean;
      eta: null;
      denoising_strength: number;
      s_min_uncond: null;
      s_churn: null;
      s_tmax: null;
      s_tmin: null;
      s_noise: null;
      override_settings: null;
      override_settings_restore_afterwards: boolean;
      refiner_checkpoint: null;
      refiner_switch_at: null;
      disable_extra_networks: boolean;
      comments: null;
      enable_hr: boolean;
      firstphase_width: number;
      firstphase_height: number;
      hr_scale: number;
      hr_upscaler: null;
      hr_second_pass_steps: number;
      hr_resize_x: number;
      hr_resize_y: number;
      hr_checkpoint_name: null;
      hr_sampler_name: null;
      hr_prompt: string;
      hr_negative_prompt: string;
      sampler_index: string;
      script_name: null;
      script_args: string[];
      send_images: boolean;
      save_images: boolean;
      alwayson_scripts: Record<string, any>;
}

interface APIResponse {
      status: number;
      image: ImageData;
      parameters: Params;
}

export class PickerSoft {
      private headers = {
            'User-Agent': 'picker1.45anim',
            Authorization: 'Basic cGlja2Vyc29mdDpkb3Rjb20=',
            'Content-Type': 'application/json; charset=utf-8',
            Host: 'snow.pickersoft.info',
            Connection: 'Keep-Alive',
            'Accept-Encoding': 'gzip',
      };

      private instance = axios.create({ baseURL: 'https://snow.pickersoft.info', headers: this.headers });

      protected payload = (prompt: string) => ({
            prompt: prompt,
            seed: -1,
            batch_size: 1,
            n_iter: 1,
            steps: 40,
            cfg_scale: 9.0,
            enable_hr: true,
            denoising_strength: 0.75,
            width: 412,
            height: 700,
            hr_scale: 2,
            restore_faces: true,
            tiling: false,
            negative_prompt:
                  'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, (worst quality, low quality:1.2), normal quality, jpeg artifacts, signature, watermark, username, blurry',
            sampler_name: 'DPM++ 2M Karras',
            sampler_index: 'Euler a',
            save_images: false,
      });

      async meina(prompt: string): Promise<APIResponse> {
            const { data } = await this.instance
                  .post('/anim/sdapi/v1/txt2img', this.payload(prompt))
                  .catch((e) => e.response);
            if (data.images) return this.createResult(data);
            else return data;
      }
      async createResult(data: { images: string[]; parameters: Params }): Promise<APIResponse> {
            const buffer = Buffer.from(data.images[0], 'base64');
            const uploadMediaResponse = await functions.uploadMedia(buffer);
            return Promise.resolve({ status: 200, image: uploadMediaResponse, parameters: data.parameters });
      }
}
