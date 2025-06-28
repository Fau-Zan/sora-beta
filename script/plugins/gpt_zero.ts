import axios from 'axios';

export const GptZero = async (text: string) => {
      const headers = {
            Authorization: 'Bearer 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',
            'Content-Type': 'application/json; charset=UTF-8',
            Connection: 'Keep-Alive',
            'Accept-Encoding': 'gzip',
            'User-Agent': 'okhttp/4.10.0',
      };
      try {
            const response = await axios.post(
                  'https://api-inference.huggingface.co/models/roberta-base-openai-detector',
                  {
                        text,
                  },
                  { headers },
            );

            const GptZero = response.data;

            const fake = GptZero.find(({ label }) => label === 'LABEL_1').score;
            const real = GptZero.find(({ label }) => label === 'LABEL_0').score;

            const fakeScore = (fake * 100).toFixed(2);
            const realScore = (real * 100).toFixed(2);

            return Promise.resolve({ fake: fakeScore, real: realScore });
      } catch (error) {
            return Promise.reject(error);
      }
};
