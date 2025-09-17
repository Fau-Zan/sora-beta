import { Config, Cmd, BaseCommand } from '../../base';
import { Whatsapp } from 'violet';
import { format } from 'util';
import { execSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const axios = require('axios');
const formData = require('form-data');
const CycleTLS = require('cycletls');

@Config()
export class Command extends BaseCommand {
      declare readonly setting: boolean;
      constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
            super(client, M);
      }

      @Cmd('(>)', {
            as: ['>'],
            division: 'owner',
            usePrefix: false,
            help: 'code',
            acc: {
                  owner: true,
            },
      })
      async Eval() {
            let ev;
            try {
                  const cycletls = await CycleTLS();
                  let { query, modify } = this;
                  if (modify.verify?.r) query.full = 'return ' + query.parsed;
                  ev = await eval(`(async () => { ${query.full}})()`);
            } catch (e: any) {
                  ev = e.message;
                  console.log(ev)
            }
            console.log(ev)
            return void (await this.replyText(format(ev)));
      }
      @Cmd('($)', {
            as: ['$'],
            division: 'owner',
            usePrefix: false,
            acc: {
                  owner: true,
            },
      })
      async Exec() {
            try {
                  const response = execSync(this.query.full).toString('utf-8');
                  if (response) return void (await this.replyText(format(response)));
            } catch (error) {
                  this.replyText(format(error));
            }
      }
}
