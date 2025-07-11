import axios from 'axios';
import FormData from 'form-data';

// created by Restu && Rizky
const validQualities = ['128', '144', '240', '320', '360', '720', '1080'];
async function y2mate(videoId: string, type: 'mp3' | 'mp4' = 'mp3', quality = '320'): Promise<Track> {
      try {
            if (!validQualities.includes(quality)) {
                  throw new Error('Resolusi tidak valid');
            }

            const form = new FormData();
            form.append('videoid', videoId);
            form.append('downtype', type);
            form.append('vquality', quality);

            const { data } = await axios.post('https://7dbc.mmnm.store/oajax.php', form, {
                  headers: {
                        ...form.getHeaders(),
                  },
            });

            return data;
      } catch (error) {
            throw error;
      }
}

export interface Track {
      status: 'tunnel';
      url: string;
      filename: string;
}
export default y2mate;
