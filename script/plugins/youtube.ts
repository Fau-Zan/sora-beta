import ytdl from '@distube/ytdl-core';
import axios from 'axios';

// Browser user agents untuk rotate
const USER_AGENTS = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// Default headers + cookies untuk bypass YouTube bot detection
const getRequestOptions = () => {
      const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      return {
            headers: {
                  'User-Agent': randomAgent,
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Sec-Fetch-Dest': 'document',
                  'Sec-Fetch-Mode': 'navigate',
                  'Sec-Fetch-Site': 'none',
                  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
                  'Sec-Ch-Ua-Mobile': '?0',
                  'Sec-Ch-Ua-Platform': '"Windows"',
                  'Cache-Control': 'max-age=0',
                  'Upgrade-Insecure-Requests': '1',
                  'Referer': 'https://www.youtube.com/',
                  'Cookie': 'CONSENT=YES+1; PREF=tz=UTC; _ga=GA1.1.1234567890.1234567890',
            },
      };
};


/**
 * Extract YouTube video ID dari URL.
 * @param url YouTube URL
 * @returns Video ID atau null jika tidak valid
 */
function getYoutubeId(url: string): string | null {
      const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/im;
      const match = url.match(regex);
      return match && match[1] ? match[1] : null;
}

/**
 * Filter format berdasarkan quality dan type (mp3/mp4).
 * @param formats List format dari getInfo
 * @param type 'mp3' atau 'mp4'
 * @param quality Quality preference (320, 240, 720, dll)
 * @returns Format terbaik yang match
 */
function selectBestFormat(
      formats: any[],
      type: 'mp3' | 'mp4',
      quality: string = '320'
): any {
      if (type === 'mp3') {
            const audioFormats = formats.filter(
                  (f) => f.mimeType && f.mimeType.includes('audio')
            );
            return audioFormats.length > 0 ? audioFormats[0] : formats[0];
      } else {
            const videoQuality = parseInt(quality);
            const videoFormats = formats.filter(
                  (f) => f.mimeType && f.mimeType.includes('video') && f.qualityLabel
            );

            if (videoFormats.length === 0) return formats[0];
            return videoFormats.reduce((best, current) => {
                  const bestHeight = parseInt(best.qualityLabel) || 0;
                  const currentHeight = parseInt(current.qualityLabel) || 0;
                  const bestDiff = Math.abs(bestHeight - videoQuality);
                  const currentDiff = Math.abs(currentHeight - videoQuality);
                  return currentDiff < bestDiff ? current : best;
            });
      }
}

async function y2mate(
      url: string,
      type: 'mp3' | 'mp4' = 'mp3',
      quality: string = '320'
): Promise<Track> {
      try {
            // Validate URL dan extract ID
            const videoId = getYoutubeId(url);
            if (!videoId) {
                  throw new Error('URL YouTube tidak valid');
            }

            // Get info lengkap video dengan agent & cookies untuk bypass bot detection
            const info = await ytdl.getInfo(url, {
                  requestOptions: getRequestOptions(),
            } as any);
            
            const videoTitle = info.videoDetails.title;
            const videoId_check = info.videoDetails.videoId;

            // Select best format sesuai type
            const format = selectBestFormat(info.formats, type, quality);

            if (!format) {
                  throw new Error(`Tidak ada format ${type} tersedia`);
            }

            // Return track object dengan stream url
            return {
                  status: 'tunnel',
                  url: format.url || '',
                  filename: `${videoTitle.replace(/[^a-zA-Z0-9 ]/g, '')}.${type === 'mp3' ? 'mp3' : 'mp4'}`,
                  videoId: videoId_check,
                  duration: info.videoDetails.lengthSeconds,
                  author: info.videoDetails.author.name,
            };
      } catch (error) {
            throw error;
      }
}

export interface Track {
      status: 'tunnel';
      url: string;
      filename: string;
      videoId?: string;
      duration?: string;
      author?: string;
}

export default y2mate;
