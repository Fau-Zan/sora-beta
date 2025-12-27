import { Config, Cmd, BaseCommand } from '../../base';
import os from 'os';

@Config()
export class Command extends BaseCommand {

      @Cmd('(ping)', {
            division: 'helper',
            usePrefix: true,
            description: 'cek bot aktif',
            as: ['ping'],
      })
      async ping() {
            const startTime = Date.now();
            const response = 'Pong!'
            const latency = Date.now() - startTime;
            const uptime = this.formatUptime(process.uptime());
            const memory = this.getMemoryUsage();
            const cpu = os.cpus();
            const timestamp = new Date().toLocaleString('id-ID');

            const statusMessage = `
${response}

┌─ Status Bot
├─ Latency: ${latency}ms
├─ Uptime: ${uptime}
├─ Memory: ${memory.used} MB / ${memory.total} MB (${memory.percent}%)
├─ CPU: ${cpu.length} cores (${cpu[0].model.trim()})
├─ Timestamp: ${timestamp}
`.trim();

            throw statusMessage;
      }
      private formatUptime(seconds: number): string {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            const parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

            return parts.join(' ');
      }

      private getMemoryUsage(): { used: string; total: string; percent: string } {
            const memUsage = process.memoryUsage();
            const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
            const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(1);
            const percent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1);

            return {
                  used: heapUsedMB,
                  total: heapTotalMB,
                  percent: percent,
            };
      }
}
