import websocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import moment from 'moment';
import { load as loadNode } from 'cheerio';
import CycleTLS, { CycleTLSClient } from 'cycletls';

export type BingConversation = Bing['chat'];
export default class Bing {
      protected options: {
            cookie?: string;
            tone?: 'Creative' | 'Precise' | 'Balance';
            cb?: (...args: any[]) => any | Promise<any>;
      };
      constructor(options: Bing['options']) {
            (async () => {
                  this.options = options ?? Object.create({});
                  this.options.cookie = this.options?.cookie || '';
                  this.options.tone = this.options.tone ?? 'Creative';
                  this.cycletls = await CycleTLS();
            })();
      }

      protected cycletls: CycleTLSClient;

      public async generateImage(prompt: string) {
            const headers = this.getHeaders(),
                  cycletls = this.cycletls;

            const data = (
                  await cycletls.get(
                        'https://www.bing.com/images/create?partner=sydney&re=1&showselective=1&sude=1&kseed=7500&SFX=2&q=' +
                              encodeURIComponent(prompt) +
                              '&iframeid=' +
                              uuidv4(),
                        { headers, userAgent: headers['User-Agent'] },
                  )
            ).body as string;
            const $ = loadNode(data);
            let url = new URLSearchParams($('meta[property=og:url]').attr('content'));
            if (url.get('id') == null)
                  return 'Bing has temporarily suspended this account as a result of continuous block prompts, try again after a few hours. Thank You';
            function create() {
                  return new Promise((resolve) => {
                        const newurl =
                              'https://www.bing.com/images/create/detail/async/' +
                              url.get('id') +
                              '?imageId=bingImages';
                        let check;
                        const intervalId = setInterval(async () => {
                              const res = await cycletls.get(newurl, { headers, userAgent: headers['User-Agent'] });
                              const body = res.body as { [key: string]: any };
                              if (body.totalEstimatedMatches > 0 || body.value === null) {
                                    clearInterval(intervalId);
                                    check = body;
                                    resolve(body);
                              }
                        }, 1500);
                        const handleTime = () => {
                              if (check) void null;
                              else
                                    resolve({
                                          iusn: false,
                                          totalEstimatedMatches: 0,
                                          value: null,
                                          generativeImageCaption: null,
                                          selectedIndex: 0,
                                    });
                              clearInterval(intervalId);
                        };
                        setTimeout(handleTime, 6 * Math.pow(100, 2));
                  });
            }
            return Promise.resolve(await create());
      }

      protected separator = '\x1E';
      protected output: Array<any>;
      protected optionsSets = {
            Precise: [
                  'nlu_direct_response_filter',
                  'deepleo',
                  'disable_emoji_spoken_text',
                  'responsible_ai_policy_235',
                  'enablemm',
                  'dv3sugg',
                  'autosave',
                  'iyxapbing',
                  'iycapbing',
                  'h3precise',
                  'spktxtibmoff',
                  'uquopt',
                  'aspectreviews',
                  'gndlogcf',
                  'blocklist',
                  'iyxapbing',
                  'iycapbing',
                  'clgalileo',
                  'gencontentv3',
                  'fluxv14',
            ],
            Creative: [
                  'nlu_direct_response_filter',
                  'deepleo',
                  'disable_emoji_spoken_text',
                  'responsible_ai_policy_235',
                  'enablemm',
                  'dv3sugg',
                  'autosave',
                  'iyxapbing',
                  'iycapbing',
                  'h3imaginative',
                  'clgalileo',
                  'gencontentv3',
                  'gcccomp',
                  'uprofgen',
                  'uprofupd',
                  'uprofupdasy',
                  'cachrecid',
                  'blocklist',
                  'iyxapbing',
                  'iycapbing',
            ],
      };
      protected genRanHex(size: number) {
            return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      }

      getHeaders() {
            return {
                  accept: 'application/json',
                  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                  'sec-ms-gec': this.genRanHex(64).toUpperCase(),
                  'x-ms-client-request-id': uuidv4(),
                  'x-ms-useragent':
                        'azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.12.0 OS/Linuxaarch64',
                  'user-agent':
                        'Mozilla/5.0 (Linux; Android 13; Redmi 9 Build/TQ2A.230505.002.A1; ) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.0.0 Mobile Safari/537.36 BingSapphire/27.2.411013306',
                  cookie: this.options.cookie,
                  Referer: 'https://www.bing.com/search?q=Bing+AI&showconv=1',
                  'Referrer-Policy': 'origin-when-cross-origin',
            };
      }

      async createConversation(setDefault = true) {
            const { data, headers } = await axios.get(
                  'https://www.bing.com/turing/conversation/create?bundleVersion=1.1359.6',
                  {
                        headers: this.getHeaders(),
                  },
            );
            const identity = Object.assign(data, {
                  signature: headers['x-sydney-conversationsignature'],
                  token: headers['x-sydney-encryptedconversationsignature'],
                  invocation: 0,
            });
            if (setDefault) this.chat = identity;
            return identity;
      }

      async getChat() {
            return (
                  await axios.get('https://www.bing.com/turing/conversation/chats', {
                        headers: this.getHeaders(),
                  })
            ).data;
      }

      public chat: {
            conversationId: string;
            clientId: string;
            signature: string;
            token: string;
            invocation: number;
      };

      wrapText(chat: any, source: boolean) {
            const x = chat.item;
            let txt = x.result.message;
            const _tmp =
                  x.messages
                        .find((v) => v.hiddenText?.includes('web_search_results'))
                        ?.hiddenText?.trim?.()
                        ?.split?.('\n') || [];
            const webSearchResults = JSON.parse(
                  _tmp[_tmp.findIndex((v: string) => v.startsWith('```json')) + 1] || '{ "web_search_results": [] }',
            ).web_search_results;

            for (const i in webSearchResults)
                  txt = txt
                        .replace(
                              new RegExp(`(\\[\\^${(i as unknown as number) * 1 + 1}\\^\\])`, 'g'),
                              source ? ` - _${webSearchResults[i].url}_` : '',
                        )
                        .replace(/([\*]{2})/g, '*')
                        .replace(/(\[.*?\])\(.*?\)/g, '');
            return txt;
      }
      async newSock(token = this?.chat?.token ?? null) {
            return new Promise<any>((res) => {
                  const url = new URL('wss://sydney.bing.com/sydney/ChatHub');
                  if (token) url.searchParams.set('sec_access_token', token);
                  const ws = new websocket(url.toString(), {
                        headers: this.getHeaders(),
                  });

                  ws.on('open', async () => {
                        if (!this.output) this.output = [];
                        void ws.send(
                              this.alterText(
                                    JSON.stringify({
                                          protocol: 'json',
                                          version: 1,
                                    }),
                              ),
                        );
                        void ws.send(
                              this.alterText(
                                    JSON.stringify({
                                          type: 6,
                                    }),
                              ),
                        );
                        res(ws);
                  });
            });
      }
      alterText = (text: string) => text + this.separator;
      async sendMessage(msg: string, source: boolean = true) {
            if (!this.chat) await this.createConversation();
            const ws = await this.newSock();
            if (ws.listenerCount('message') === 0)
                  ws.on('message', async (mess) => {
                        let dataChat = mess
                              .toString()
                              .split(this.separator)
                              .filter(Boolean)
                              .map((r) => JSON.parse(r));
                        for (const chat of dataChat) {
                              switch (chat.type) {
                                    case 6:
                                          await ws.send(
                                                this.alterText(
                                                      JSON.stringify({
                                                            type: 6,
                                                      }),
                                                ),
                                          );
                                          break;
                                    case 3:
                                          await void null;
                                          break;
                                    case 1:
                                          const message = chat?.arguments?.[0].messages?.[0];
                                          if (message?.messageType === 'InternalSearchQuery' && message?.text)
                                                this.options.cb(message.text);
                                          this.output.push(chat);
                                          break;
                                    case 2:
                                          this.output.push(chat);
                                          const { result } = chat.item;
                                          if (result.value === 'UnauthorizedRequest')
                                                return void this.options.cb({
                                                      status: 'token expired',
                                                      message: result.message,
                                                });
                                          else if (result.value !== 'Success')
                                                return void this.options.cb({ status: result.value });
                                          const msg =
                                                chat?.item?.messages?.find((p) => p.scores && p.author === 'bot')
                                                      ?.text || chat.item.result.message;
                                          chat.item.result.message = msg;
                                          this.options.cb(this.wrapText(chat, source));
                                          await ws.close();
                                          break;
                              }
                        }
                  });
            return void (await ws.send(this.payload(msg)));
      }

      payload(msg: string) {
            const timestamp = moment().utcOffset(8).format('YYYY-MM-DDThh:mm:ssZ');
            const id = uuidv4();
            const optionsSets = this.optionsSets[this.options.tone];
            const invocation = this.chat.invocation === 0 ? !0 : !1;
            return (
                  JSON.stringify({
                        arguments: [
                              {
                                    source: 'cib',
                                    optionsSets,
                                    allowedMessageTypes: [
                                          'ActionRequest',
                                          'Chat',
                                          'ConfirmationCard',
                                          'Context',
                                          'InternalSearchQuery',
                                          'InternalSearchResult',
                                          'Disengaged',
                                          'InternalLoaderMessage',
                                          'InvokeAction',
                                          'Progress',
                                          'RenderCardRequest',
                                          'RenderContentRequest',
                                          'AdsQuery',
                                          'SemanticSerp',
                                          'GenerateContentQuery',
                                          'SearchQuery',
                                    ],
                                    sliceIds: [
                                          '1326cf',
                                          'tts4cf',
                                          '1030disltabs0',
                                          'stylmobv2',
                                          'caccnctat1',
                                          'inochatv2',
                                          'wrapnoins',
                                          'rwt1',
                                          'cacmuidarbcf',
                                          'adsdynw-prod',
                                          '1031hpdalles0',
                                          '713logprobss0',
                                          '927uprofasy',
                                          '917fluxvs0',
                                          'kchero50cf',
                                          'cacduperec',
                                    ],
                                    verbosity: 'verbose',
                                    scenario: 'Sapphire',
                                    plugins: [],
                                    traceId: this.genRanHex(32),
                                    conversationHistoryOptionsSets: ['autosave', 'savemem', 'uprofupd', 'uprofgen'],
                                    isStartOfSession: invocation,
                                    requestId: id,
                                    message: {
                                          locale: 'en-US',
                                          market: 'en-US',
                                          region: 'ID',
                                          location: 'lat:47.639557;long:-122.128159;re=1000m;',
                                          userIpAddress: '125.162.208.174',
                                          timestamp,
                                          locationHints: [
                                                {
                                                      Center: {
                                                            Latitude: -5.171171171171171,
                                                            Longitude: 119.42300348214816,
                                                      },
                                                      RegionType: 1,
                                                      SourceType: 5,
                                                },
                                          ],
                                          locationinfo: null,
                                          author: 'user',
                                          inputMethod: 'Keyboard',
                                          text: msg,
                                          messageType: 'Chat',
                                          requestId: id,
                                          messageId: id,
                                    },
                                    tone: this.options.tone,
                                    spokenTextMode: 'None',
                                    conversationSignature: this.chat.signature,
                                    conversationId: this.chat.conversationId,
                                    participant: {
                                          id: this.chat.clientId,
                                    },
                              },
                        ],
                        invocationId: '0',
                        target: 'chat',
                        type: 4,
                  }) + this.separator
            );
      }
}
