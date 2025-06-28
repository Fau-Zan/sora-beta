import FormData from 'form-data';
import axios from 'axios';
import { functions } from '../utils';

export const Recognize_Image = async (buffer: Buffer) => {
      const { data: buff, ext } = await functions.getFile(buffer);

      const data = JSON.stringify({
            parameters: {
                  platform: 'android',
                  command: 'predict',
                  prompt: '',
                  user_id: '',
                  lang: 'en',
            },
      });

      const formData = new FormData();
      formData.append('data', data);
      formData.append('file', buff, `ImageChat_${Date.now()}.${ext}`);

      const response = await axios
            .post('https://imagechat.chooch.ai/predict_v2?api_key=69c8f610-76b5-451e-81d6-3d92862d18d8&file=', formData)
            .catch((error) => error.response);
      const res = response.data;

      return res;
};
