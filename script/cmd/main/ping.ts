import { Config, Cmd, BaseCommand } from '../../base';
@Config()
export class Command extends BaseCommand {
      @Cmd('(ping)', {
            division: 'helper',
            usePrefix: true,
            description: "cek bot aktif atau tidak",
            as: ['ping'],
      })
      async ping() {
            throw 'pong!';
      }
}
