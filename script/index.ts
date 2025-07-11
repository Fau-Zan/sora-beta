import dotenv from 'dotenv';
dotenv.config({ path: 'env' });
import * as Listener from './listeners';
import { BaseClient, Pair } from './handlers';
import { Boom } from '@hapi/boom';
import { Whatsapp } from 'violet';
import MainStart, {
      AuthenticationCreds,
      ConnectionState,
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      makeInMemoryStore,
      MessageUpsertType,
      proto,
      SignalKeyStore,
      UserFacingSocketConfig,
} from '@whiskeysockets/baileys';
import { singleSession, Database } from './database';
import { functions } from './utils';
import NodeCache from 'node-cache';
import { rimrafSync } from 'rimraf';
import readline from 'readline';

const msgRetryCounterCache = new NodeCache();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve));
export async function autoStart(configName: string = 'zan', usePair: boolean = true) {
      rimrafSync(configName + '/LOCK');
      const pocket = new Database(configName);
      const { state, saveState } = await singleSession(configName);
      const config: UserFacingSocketConfig = {
            auth: {
                  creds: state.creds,
                  keys: makeCacheableSignalKeyStore(state.keys as SignalKeyStore, functions.logger),
            },
            printQRInTerminal: !usePair,
            mobile: false,
            browser: ['Chrome (Linux)', '', ''],
            version: (await fetchLatestBaileysVersion()).version,
            logger: functions.logger,
            qrTimeout: 60000,
            msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
      };
      const store = makeInMemoryStore({});

      store.readFromFile = async () => {
            const get = await pocket.get<Whatsapp.Store>('store').catch(() => console.log('err'));
            if (!get) return void null;
            const json = JSON.parse(get!.store);
            store.fromJSON(json);
      };

      store.writeToFile = async () => {
            const stores = JSON.stringify(store.toJSON());
            await pocket
                  .saveOrUpdateDocument<Whatsapp.Store>({
                        _id: 'store',
                        store: stores,
                  })
                  .catch(() => store.writeToFile(String.name));
      };

      //connect
      const client = new BaseClient();
      client.sock = (MainStart as any).default(config);
      client.store = store;

      if (usePair && !client.sock.authState.creds.registered) {
            const phoneNumber = await question('Enter your mobile phone number:\n');
            const code = await client.sock.requestPairingCode(phoneNumber);
            console.log(`Pairing code: ${code}`);
      }

      client.sock.ev.on('connection.update', async (arg: Partial<ConnectionState>) => {
            const { connection, lastDisconnect } = arg;
            if (arg.qr) {
                  /*const { client }: { client: Whatsapp.IClient } = this;
                  const { M }: { M: Whatsapp.IWaMess } = this;
                  client.sendMessage(M.from, await qrBuffer(arg.qr), 'imageMessage', {
                        caption: 'scan this masbro',
                        quoted: M,
                  });**/
            }
            switch (connection) {
                  case 'close':
                        if (new Boom(lastDisconnect?.error).output.statusCode !== DisconnectReason.loggedOut) {
                              return autoStart();
                        }
                        break;
                  case 'open':
                        client.store.bind(client.sock.ev);
                        return void client.store.readFromFile(String());
                  case 'connecting':
                        console.log('connecting...');
            }
      });

      const cmdDirectory = (await functions.parseCmd()).dir;

      client.on('message.tag', Listener.Tag.bind(client));

      client.on('reaction', Listener.Reaction.bind(client));

      client.on('pair.cmd', (M) => {
            if (cmdDirectory.length >= 1)
                  return void Pair.bind({ events: cmdDirectory })({
                        client: M.client,
                        M: M.M,
                  });
      });

      client.once('end', () => {
            client.removeAllListeners;
            client.setMaxListeners(0);
            return void client.sock.end(new Error());
      });

      client.on('store.update', (): void => void client.store.writeToFile(''));

      client.sock.ev.on('messages.upsert', (arg: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType }) => {
            new Listener.Message(client, arg);
      });

      client.sock.ev.on('creds.update', (creds: Partial<AuthenticationCreds>) => {
            if (creds) creds;
            return saveState();
      });

      setInterval(() => client.emit('store.update'), 10000);
      process.on('exit', client.restartNodeProcess);
}

autoStart();
