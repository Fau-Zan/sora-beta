import { jidDecode } from '@whiskeysockets/baileys';
import type { Whatsapp as Wa } from 'violet';
import similarity from 'similarity';
import micro from 'micromatch';
import _ from 'lodash';
import { functions, Logger } from '../utils';

export const Pair = async function Pair({ client, M }: { client: Wa.IClient; M: Wa.IWaMess }) {
      client = client;
      this.M = M;
      const msgType = M.type || 'unknown';
      
      // Skip logging for protocol messages (system messages like delete, edit, etc)
      if (msgType !== 'protocolMessage') {
        const msgContent = M.body || '[no text content]';
        Logger.info(`📨 Message - Type: ${msgType} | From: ${M.from} | Content: ${msgContent.substring(0, 100)}${msgContent.length > 100 ? '...' : ''}`);
      }
      
      let prefix = '?';
      let [cmd, ...args] = String(M.body).split(/ +/),
            full_query = args.join(' ');

      const parsedText = (M.parsedText = (text: string) => {
            const cli_parser = {
                  verify: new Object(),
                  usage: new Object(),
                  command: new String(),
            };

            const parts = text.split(/ +/);
            cli_parser.command = cmd;
            let i = 0;
            while (i < parts.length) {
                  const part = parts[i];
                  if (part.startsWith('--')) {
                        const [argName, argValue] = part.substring(2).split(/ +/);
                        if (i + 1 < parts.length && !parts[i + 1].startsWith('--')) {
                              cli_parser.usage[argName] = parts[i + 1];
                              i++;
                        } else {
                              cli_parser.verify[argName] = argValue ? !1 : !0;
                        }
                  }

                  i++;
            }

            let parsed = '';
            i = 0;
            while (i < parts.length && !parts[i].startsWith('--')) {
                  parsed += ' ' + parts[i];
                  i++;
            }

            return {
                  result_parsed: cli_parser,
                  text_parsed: parsed,
            } as any;
      });

      const _parsedText = parsedText(full_query).text_parsed.trimStart();
      let query = {
            full: !full_query.trim() ? undefined : full_query.trimStart(),
            parsed: !_parsedText.trim() ? undefined : _parsedText.trimStart(),
      };

      const checkSimilarity = async () => {
            var useCmd = cmd.startsWith(prefix) ? cmd.toLowerCase().slice(1) : '';

            const getList = Array.from(new Array());
            const libCmd = Array.from((await functions.parseCmd()).property).filter(Boolean) as any[];
            for (const rawItems of libCmd) for (const noise of rawItems) getList.push(noise);
            const rawItems = getList.map(([, K]) => ({
                  alias: K.as.map((cmd: string) => cmd.toLowerCase()),
                  usePref: K.usePrefix,
            }));

            const isSign = rawItems.find((pre) => {
                  return pre.alias.some((val: string) => val === useCmd);
            });
            if (isSign) return {} as Result;

            type Result = {
                  preKeys: string;
                  percentage: number;
            };
            var result: Result = {} as Result;
            for await (const props of rawItems) {
                  while (props.alias.length !== 0) {
                        const diff = await similarity(useCmd, props.alias[0]);
                        if (diff >= 0.691 && diff < 1 && props.usePref) {
                              if (!result.preKeys) {
                                    result.preKeys = props.alias[0];
                                    result.percentage = diff;
                              }
                        } else if (result.preKeys && diff > result.percentage && diff < 1) {
                              result.preKeys = props.alias[0];
                              result.percentage = diff;
                        }
                        props.alias = props.alias.slice(1);
                  }
            }
            return result;
      };

      var simiDetector = await checkSimilarity();
      if ('preKeys' in simiDetector) {
            var { preKeys: offerKey, percentage: sensitive } = simiDetector;
            return void (await client.sendText(
                  M.from,
                  `mungkin maksud anda adalah "${prefix}${offerKey}" dengan presentasi kesamaan: ${
                        Math.round(sensitive * 100 * 100) / 100
                  }%`, { quoted: M }
            ))
      }

      for (let events of this.events) {
            events = await import(events);
            events = events[_.keys(events)[0]];
            events = new events(client, M);
            if (events.all && !cmd.trim().startsWith(prefix))
                  await events.all
                        .bind(events)()
                        .catch((p) => p);
            const property: [string | string[], Wa.CmdProperty][] = events.property;
            for (let handler of property) {
                  const [command, plugin] = handler;

                  (events.cmd = cmd.replace(prefix, '').toLowerCase()),
                        (events.query = query),
                        (events.args = args),
                        (events.modify = parsedText(full_query).result_parsed);

                  const cmdWithPref = plugin.usePrefix && cmd.trim().startsWith(prefix) ? true : undefined;
                  const cmdWithoutPref = !plugin.usePrefix ? true : undefined;
                  if (!cmdWithPref && !cmdWithoutPref) continue;
                  const isValid = Array.isArray(command)
                        ? micro.some(command, events.cmd)
                        : typeof command == 'string'
                        ? micro.matcher(command)(events.cmd) || command === events.cmd
                              ? true
                              : false
                        : undefined;
                  if (!isValid) continue;
                  if (plugin.acc?.admin && !M.admin) {
                        return client.sendMessage(M.from, 'this command can be used for admin', 'conversation', {
                              quoted: M,
                        });
                  }
                  if (plugin.acc?.textOrQuotedText && !query.full) continue;
                  return void (await plugin
                        .bind(events)(events)
                        .catch((_th) => {
                              client.sendText(this.M.from, typeof _th == 'object' ? _th.message : _th, {
                                    quoted: this.M,
                              });
                        }));
            }
      }
};
