import { Config, Cmd, BaseCommand } from '../../base';
import { Whatsapp } from 'violet';
import { format } from 'util';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { Logger } from '../../utils/logger';
const require = createRequire(import.meta.url);
const fs = require('fs');
const axios = require('axios');
const formData = require('form-data');
const path = require('path');

@Config()
export class Command extends BaseCommand {
      declare readonly setting: boolean;
      
      constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
            super(client, M);
      }

      /**
       * JavaScript Eval Command
       * Usage: > code here
       * Flags: --r (return), --json (output as JSON), --inspect (deep inspect)
       */
      @Cmd('(>)', {
            as: ['>'],
            division: 'owner',
            usePrefix: false,
            help: 'Evaluate JavaScript code | Usage: > code [--r] [--json] [--inspect]',
            acc: {
                  owner: true,
            },
      })
      async Eval() {
            let ev;
            let startTime = Date.now();
            try {
                  let { query, modify } = this;
                  
                  if (!query.full) {
                        return void (await this.replyText('⚠️ Gunakan format: > code'));
                  }

                  // Auto return if --r flag
                  if (modify.verify?.r) {
                        query.full = 'return ' + query.parsed;
                  }

                  // Create sandbox context dengan useful utilities
                  const sandbox = {
                        // Baileys & Client utilities
                        client: this.client,
                        M: this.M,
                        send: (text: string) => this.client.sendText(this.M.from, text, { quoted: this.M }),
                        reply: (text: string) => this.replyText(text),
                        
                        // File system
                        fs,
                        path,
                        readFile: (file: string) => fs.readFileSync(file, 'utf-8'),
                        writeFile: (file: string, data: string) => fs.writeFileSync(file, data),
                        
                        // HTTP requests
                        axios,
                        fetch: (url: string) => axios.get(url),
                        post: (url: string, data: any) => axios.post(url, data),
                        
                        // Database
                        db: this.client.store,
                        postgres: require('../../../script/database/postgres'),
                        require,
                        console,
                        Logger,
                        JSON,
                        Math,
                        Date,
                        Buffer,
                        stringify: (obj: any) => format(obj),
                        inspect: (obj: any, depth: number = 3) => format(obj, false, depth),
                  };

                  // Execute dengan timeout 10 detik
                  const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('⏱️ Execution timeout (10s)')), 10000)
                  );

                  const evalPromise = (async () => {
                        // Bind sandbox variables
                        const keys = Object.keys(sandbox);
                        const values = Object.values(sandbox);
                        const code = `(async () => { ${query.full}})()`;
                        
                        ev = await eval(`
                              (function(${keys.join(',')}) {
                                    return ${code};
                              })(${keys.map(k => 'sandbox.' + k).join(',')})
                        `);
                  })();

                  await Promise.race([evalPromise, timeoutPromise]);

                  // Format output
                  const execTime = Date.now() - startTime;
                  const output = this._formatOutput(ev, modify);
                  
                  const response = `✅ Success (${execTime}ms)\n\`\`\`\n${output}\n\`\`\``;
                  return void (await this.replyText(response));

            } catch (e: any) {
                  const execTime = Date.now() - startTime;
                  const errMsg = e.message || e.toString();
                  
                  Logger.error('Eval error:', e);
                  
                  const response = `❌ Error (${execTime}ms)\n\`\`\`\n${errMsg}\n\`\`\``;
                  return void (await this.replyText(response));
            }
      }

      /**
       * Shell Command Execution
       * Usage: $ command here
       * Flags: --dir /path (change directory), --json (parse as JSON)
       */
      @Cmd('($)', {
            as: ['$'],
            division: 'owner',
            usePrefix: false,
            help: 'Execute shell command | Usage: $ command [--dir /path] [--json]',
            acc: {
                  owner: true,
            },
      })
      async Exec() {
            let startTime = Date.now();
            try {
                  const { query, modify } = this;
                  
                  if (!query.full) {
                        return void (await this.replyText('⚠️ Gunakan format: $ command'));
                  }

                  // Get working directory
                  const cwd = modify.usage?.dir || process.cwd();
                  
                  // Check if directory exists
                  if (!fs.existsSync(cwd)) {
                        return void (await this.replyText(`❌ Directory not found: ${cwd}`));
                  }

                  const response = execSync(query.full, {
                        cwd,
                        encoding: 'utf-8',
                        maxBuffer: 1024 * 1024 * 5, // 5MB buffer
                        timeout: 15000, // 15s timeout
                  });

                  const execTime = Date.now() - startTime;
                  const output = (response as string).trim();
                  
                  // Parse as JSON if --json flag
                  if (modify.verify?.json) {
                        try {
                              const parsed = JSON.parse(output);
                              const formatted = format(parsed, false, 3);
                              return void (await this.replyText(`✅ JSON (${execTime}ms)\n\`\`\`\n${formatted}\n\`\`\``));
                        } catch {
                              // Fall through to normal output
                        }
                  }

                  if (output) {
                        const truncated = output.length > 2000 ? output.substring(0, 2000) + '\n...[truncated]' : output;
                        return void (await this.replyText(`✅ Output (${execTime}ms)\n\`\`\`\n${truncated}\n\`\`\``));
                  } else {
                        return void (await this.replyText(`✅ Executed (${execTime}ms) - No output`));
                  }

            } catch (error: any) {
                  const execTime = Date.now() - startTime;
                  const errMsg = error.stderr?.toString() || error.message || error.toString();
                  const truncated = errMsg.length > 1000 ? errMsg.substring(0, 1000) + '\n...[truncated]' : errMsg;
                  
                  Logger.error('Exec error:', error);
                  return void (await this.replyText(`❌ Error (${execTime}ms)\n\`\`\`\n${truncated}\n\`\`\``));
            }
      }

      /**
       * Helper function untuk format output
       */
      private _formatOutput(value: any, modify: any): string {
            try {
                  // --json flag
                  if (modify.verify?.json) {
                        return JSON.stringify(value, null, 2);
                  }

                  // --inspect flag untuk deep inspection
                  if (modify.verify?.inspect) {
                        return format(value, false, 10);
                  }

                  // Default formatting
                  if (typeof value === 'string') {
                        return value;
                  }

                  if (value === null) {
                        return 'null';
                  }

                  if (value === undefined) {
                        return 'undefined';
                  }

                  // Untuk object/array, gunakan format dengan depth 3
                  return format(value, false, 3);
            } catch (e: any) {
                  return `[Format Error: ${e.message}]`;
            }
      }
}
