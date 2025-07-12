import DB from 'pouchdb';
import { Logger } from '../utils';
import pouchdb_find from 'pouchdb-find';
import * as pouchdb_upsert from 'pouchdb-upsert';
DB.plugin(pouchdb_find);
DB.plugin(pouchdb_upsert);

export class Database extends DB {
      constructor(
            public name: string = 'zan',
            public config: PouchDB.Configuration.DatabaseConfiguration = {
                  deterministic_revs: true,
                  size: 5 * 1024 * 1024,
                  auto_compaction: true,
            },
      ) {
            super(name, config);
      }

      public async queryItemSelector<T extends object>(item: PouchDB.Find.Selector) {
            const query = (await this.find({
                  selector: item,
            })) as PouchDB.Find.FindResponse<T>;
            return query;
      }

      public async update<T>(id: string, docs: T) {
            try {
                  const item = await this.upsert(
                        {
                              _id: id,
                              ...docs,
                        },
                        true,
                  );
                  if (item) return true;
            } catch (err) {
                  this.update(id, docs);
            }
      }
      public findOne<T extends object>(id: string) {
            try {
                  const data = this.get<T>(id);
                  return data as unknown as PouchDB.Core.Document<T>;
            } catch (err) {
                  return {} as any;
            }
      }

      public async saveOrUpdateDocument<T extends object>(
            docs: PouchDB.Core.Document<T> & Partial<PouchDB.Core.RevisionIdMeta>,
      ) {
            const document = await this.get(docs._id).catch(() => null);
            if (!document) return await this.upsert<typeof docs>(docs);
            else return await this.upsert(Object.assign({}, document, docs), true);
      }

      public async upsert<T extends object>(
            docs: PouchDB.Core.Document<T> & Partial<PouchDB.Core.RevisionIdMeta>,
            ov_rev_requirement = false,
      ): Promise<PouchDB.Core.Response | undefined> {
            if (!docs._id) {
                  Logger.error('Missing _id Property. to insert a new document, include a unique ID');
            }
            if (ov_rev_requirement) {
                  docs._rev = docs._rev ?? ((await this.findOne<typeof docs>(docs._id).catch()) || {})._rev;
            }
            return this.put(docs);
      }

      public async delete<T>(docs: Partial<T> & PouchDB.Core.IdMeta & PouchDB.Core.RevisionIdMeta) {
            return await this.remove(docs);
      }

      public reset(): void {
            this.destroy().then(() => {
                  new Database();
            });
      }
}
