import { buildHeaders } from './anime_filters';
import axios from 'axios';

export default async (buffer: Buffer, ext: string, mime: string) => {
      const { upload_url } = (
            await axios
                  .post(
                        'https://cf.res.lightricks.com/v2/api/upload-location',
                        { full_name: 'put', input_type: ext },
                        { headers: buildHeaders() },
                  )
                  .catch((e) => e.response)
      ).data;
      const { status } = await axios
            .put(upload_url, buffer, { headers: { ...buildHeaders(), 'Content-Type': mime } })
            .catch((e) => e.response);
      if (status != 200) throw status;
      const {
            data: { status_url },
      } = await axios
            .post(
                  'https://cf.res.lightricks.com/v1/api/gfg-superres/predict',
                  { inputs: [upload_url] },
                  { headers: buildHeaders() },
            )
            .catch((e) => e.response);

      const check = async () =>
            await axios
                  .get(status_url)
                  .catch((e) => e.response)
                  .then(async ({ data }) => (data['status-code'] === 'done' ? data : await check()));

      return check();
};
