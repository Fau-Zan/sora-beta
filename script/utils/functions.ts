import fs from 'fs';
import axios from 'axios';
import { cleanEnv, str } from 'envalid';
import path from 'path';
import { pathToFileURL } from 'url';
import { config } from 'dotenv';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import { Whatsapp } from 'violet';
import pino from 'pino';

config();
class Functions {
      private async importFresh(modulePath: string): Promise<any> {

            const fileUrl = pathToFileURL(modulePath).href + `?t=${Date.now()}`;
            return import(fileUrl);
      }
      public parseCmd = async () => {
            const dir: any[] = functions.walk(path.join(process.cwd(), 'lib', 'cmd'));
            let property: Map<string, Whatsapp.CmdProperty>[] = [];
            for (let event of dir) {
                  event = await this.importFresh(event);
                  event = Object.values(event)[0];
                  event = event.prototype.property as Map<string, Whatsapp.CmdProperty>;
                  if (event) property.push(event);
            }
            return {
                  property,
                  dir,
            };
      };

      public async wrapMenu() {
            let plugins: { [K: string]: Whatsapp.CmdProperty } = {};
            const items = await this.parseCmd().then(({ property }) => property);
            for await (const data of items)
                  Array.from(data).map(([k, v]) => {
                        plugins[k] = v;
                  });
            const result = Object.entries(plugins).reduce((acc, [key, value]) => {
                  for (const as of value.as) {
                        const group = value.division;
                        if (acc[group]) {
                              acc[group].push({
                                    command: as,
                                    description: value.description,
                                    isPrefix: value.usePrefix,
                              });
                        } else {
                              acc[group] = [
                                    {
                                          command: as,
                                          description: value.description,
                                          isPrefix: value.usePrefix,
                                    },
                              ];
                        }
                  }
                  return acc;
            }, {});
            return result;
      }
      public getEnv() {
            return cleanEnv(process.env, {
                  bing: str(),
                  tensor: str(),
            });
      }
      get logger() {
            const pinoLogger = {
                  level: 'silent', // Set to 'silent' to suppress Baileys warnings, or 'error' to only show errors
                  base: undefined,
                  transport: {
                        target: 'pino-pretty',
                  },
                  options: {
                        colorize: true,
                        message: (msg: any) => msg.message,
                  },
            };
            return pino(pinoLogger) as any;
      }

      public async isImageSafe(path: Buffer | string): Promise<{ isSafe: boolean; rating: number }> {
            const { data: buffer } = await this.getFile(path);
            const { link } = await this.uploadMedia(buffer);
            return Promise.resolve(
                  (await axios.post('https://kawaii-ai-image-generator.herokuapp.com/image/safety', { imageURL: link }))
                        .data,
            );
      }
      public async uploadMedia(buffer: Buffer) {
            let { data: file, ext } = await this.getFile(buffer);
            const form = new FormData();
            form.append('file', file as unknown as Blob, `file_${Date.now() / 1000}.${ext}`);
            return (await axios.post('https://file.io/', form).catch((e) => e.response)).data;
      }

      async getFile(PATH, saveToFile: boolean = false) {
            let res, filename;
            const data = Buffer.isBuffer(PATH)
                  ? PATH
                  : /^data:.*?\/.*?;base64,/i.test(PATH)
                  ? Buffer.from(PATH.split`,`[1], 'base64')
                  : /^https?:\/\//.test(PATH)
                  ? (res = Buffer.from(await (await fetch(PATH)).arrayBuffer()))
                  : fs.existsSync(PATH)
                  ? ((filename = PATH), fs.readFileSync(PATH))
                  : typeof PATH === 'string'
                  ? PATH
                  : Buffer.alloc(0);
            if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
            const type = (await fileTypeFromBuffer(new Uint8Array(data))) || {
                  mime: 'application/octet-stream',
                  ext: '.bin',
            };
            if (data && saveToFile && !filename)
                  (filename = path.join(process.cwd(), '../tmp/' + new Date() + '.' + type.ext)),
                        await fs.promises.writeFile(filename, new Uint8Array(data));
            return {
                  res,
                  filename,
                  ...type,
                  data,
                  deleteFile() {
                        return filename && fs.promises.unlink(filename);
                  },
            };
      }

      public mergeArray<TItem>(...parts: Array<TItem | Array<TItem>>): Array<TItem>;
      public mergeArray<TItem>(...parts: ReadonlyArray<TItem | ReadonlyArray<TItem>>): ReadonlyArray<TItem>;
      public mergeArray<TItem>(...parts: ReadonlyArray<TItem | ReadonlyArray<TItem>>): ReadonlyArray<TItem> {
            const out = [];
            for (const part of parts) {
                  if (Array.isArray(part)) {
                        out.push(...part);
                  } else {
                        out.push(part);
                  }
            }

            return out;
      }


      public FunctionName(Fn: Function): string {
            return (Fn as any)[Symbol.name] || Fn.name;
      }

      public walk(dir: string) {
            var results: string[] = [];
            const list = fs.readdirSync(dir);
            var i = 0;
            function next(): string[] {
                  var file = list[i++];
                  if (!file) return results;
                  file = path.resolve(dir, file);
                  const stat = fs.statSync(file, undefined) as fs.Stats;
                  if (stat && (stat.isDirectory() as boolean)) {
                        const res = functions.walk(file);
                        results = results.concat(res);
                        return next();
                  } else {
                        results.push(file);
                        return next();
                  }
            }
            return next();
      }

      public static normalizeStringPath(path: string, allowAboveRoot: boolean) {
            let res = '';
            let lastSegmentLength = 0;
            let lastSlash = -1;
            let dots = 0;
            let char = null;
            for (let i = 0; i <= path.length; ++i) {
                  if (i < path.length) {
                        char = path[i];
                  } else if (char === '/') {
                        break;
                  } else {
                        char = '/';
                  }
                  if (char === '/') {
                        if (lastSlash === i - 1 || dots === 1) {

                        } else if (dots === 2) {
                              if (
                                    res.length < 2 ||
                                    lastSegmentLength !== 2 ||
                                    res[res.length - 1] !== '.' ||
                                    res[res.length - 2] !== '.'
                              ) {
                                    if (res.length > 2) {
                                          const lastSlashIndex = res.lastIndexOf('/');
                                          if (lastSlashIndex === -1) {
                                                res = '';
                                                lastSegmentLength = 0;
                                          } else {
                                                res = res.slice(0, lastSlashIndex);
                                                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
                                          }
                                          lastSlash = i;
                                          dots = 0;
                                          continue;
                                    } else if (res.length !== 0) {
                                          res = '';
                                          lastSegmentLength = 0;
                                          lastSlash = i;
                                          dots = 0;
                                          continue;
                                    }
                              }
                              if (allowAboveRoot) {
                                    res += res.length > 0 ? '/..' : '..';
                                    lastSegmentLength = 2;
                              }
                        } else {
                              if (res.length > 0) {
                                    res += `/${path.slice(lastSlash + 1, i)}`;
                              } else {
                                    res = path.slice(lastSlash + 1, i);
                              }
                              lastSegmentLength = i - lastSlash - 1;
                        }
                        lastSlash = i;
                        dots = 0;
                  } else if (char === '.' && dots !== -1) {
                        ++dots;
                  } else {
                        dots = -1;
                  }
            }
            return res;
      }
}

export const functions = new Functions();
