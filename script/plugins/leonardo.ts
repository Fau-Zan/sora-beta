import axios, { AxiosResponse } from 'axios';

type LeonardoResult = {
      success: boolean;
      data: string;
      gaim_url: string;
};

type RequestPayload = {
      modelId: string;
      tool_id: string;
      prompt: string;
      pre_prompt: string;
      negative_prompt: string;
      width: string;
      height: string;
};

export const LeonardoAi = async (payload: Partial<RequestPayload>): Promise<LeonardoResult> => {
      const headers = {
            accept: 'application/json',
            stytch_session_token: 'URwBNU02AZMG0NqQ5yz6uYZ5tiH_bTSqq9lWWr2nsEWk',
            'Content-Type': 'application/json',
            Connection: 'Keep-Alive',
            'Accept-Encoding': 'gzip',
            'User-Agent': 'okhttp/4.9.2',
      };

      const { data } = await axios
            .post<AxiosResponse<LeonardoResult>>(
                  'https://gaim-mobile-backend-vr97s.ondigitalocean.app/images/generate',
                  {
                        prompt: payload.prompt ?? '',
                        pre_prompt: payload.pre_prompt ?? '',
                        negative_prompt: payload.negative_prompt ?? '',
                        modelId: payload.modelId ?? '1e60896f-3c26-4296-8ecc-53e2afecc132',
                        promptMagic: true,
                        promptMagicVersion: 'v3',
                        imagePromptWeight: '0.6',
                        width: payload.width ?? '512',
                        height: payload.height ?? '512',
                        num_images: '1',
                        guidance_scale: '9',
                        highContrast: true,
                        public: false,
                        nsfw: true,
                        dynamic_id: 'user-live-04327df5-7bd0-4b16-84da-0329e16f796d',
                        init_image_id: null,
                        init_strength: null,
                        image_public: false,
                        prompt_public: false,
                        tool_id: payload.tool_id ?? '654189338705460b42484e52',
                  },
                  { headers },
            )
            .catch((e) => e.response);

      return Promise.resolve(data as LeonardoResult);
};
