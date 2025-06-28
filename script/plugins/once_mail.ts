import axios from 'axios';

function bytesToSize(bytes) {
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes == 0 || isNaN(bytes * 1)) return '0 B';
      const i = Number(Math.floor(Math.log(bytes) / Math.log(1024)));
      return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

export class OneSecMail {
      email: string;
      username: string;
      host: string;
      constructor(email: string) {
            this.email = email || '';
            this.username = this.email.split('@')[0] || '';
            this.host = this.email.split('@')[1] || '';
      }

      get secmail() {
            return axios.create({
                  baseURL: 'https://www.1secmail.com/api/v1/?action=',
            });
      }

      async fetch() {
            const {
                  data: [email],
            } = await this.secmail.get('genRandomMailbox&count=1');
            this.email = email;
            [this.username, this.host] = this.email.split('@');
            return this;
      }

      async delete() {
            await this.secmail.get(`deleteMailbox&login=${this.username}&domain=${this.host}`);
            return true;
      }

      async lists() {
            const { data } = await axios.get(`getMessages&login=${this.username}&domain=${this.host}`);
            return data;
      }

      async read(id) {
            const { data } = await axios.get(`readMessage&login=${this.username}&domain=${this.host}&id=${id}`);
            if (!data.from)
                  throw {
                        status: 404,
                        message: data,
                  };

            data.attachments = (data.attachments || []).map((v) => ({
                  filename: v.filename,
                  contentType: v.contentType,
                  size: v.size,
                  fSize: bytesToSize(v.size),
                  url: `download&login=${this.username}&domain=${this.host}&id=${id}&file=${v.filename}`,
            }));
            return data;
      }
}
