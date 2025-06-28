export class NodeCache {
      public cache: { [key: string]: { value: any; expireAt: number } } = {};
      isStop: boolean;

      public set(key: string, value: any, ttl: number = 0): void {
            this.cache[key] = {
                  value,
                  expireAt: Date.now() + ttl * 1000,
            };
      }

      public get(key: string): any {
            const item = this.cache[key];
            if (item && item.expireAt > Date.now()) {
                  return item.value;
            } else {
                  delete this.cache[key];
                  return null;
            }
      }

      public has(key: string): boolean {
            const item = this.cache[key];
            if (item && item.expireAt > Date.now()) {
                  return true;
            } else {
                  delete this.cache[key];
                  return false;
            }
      }

      public remove(key: string): void {
            delete this.cache[key];
      }

      public clear(): void {
            this.cache = {};
      }

      public getSize(): number {
            return Object.keys(this.cache).length;
      }
}
