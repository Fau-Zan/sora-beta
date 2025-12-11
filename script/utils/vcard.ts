import { isLidUser, jidDecode } from '@whiskeysockets/baileys';
import { parsePhoneNumber } from 'libphonenumber-js';
export class VCard {
      public FN: string;
      public ORG: string;
      public item: {
            tel: string;
            custom?: {
                  email?: string;
                  website?: string;
                  busines?: {
                        enable: boolean;
                        desc?: string;
                  };
            };
      };

      addFullName(str: string) {
            this.FN = str;
            return this;
      }
      addOrg(str: string) {
            this.ORG = str;
            return this;
      }
      addItem(item: VCard['item']) {
            this.item = item;
            return this;
      }

      build() {
            let { FN, ORG, item } = this;
            item.tel = isLidUser(item.tel) ? jidDecode(item.tel)!.user : item.tel;
            const formatPhone = parsePhoneNumber('+' + item.tel);
            let firstCard = 'BEGIN:VCARD';
            let version = 'VERSION:3.0';
            let name = 'N:' + FN.split(/ +/).reverse().join(';') + ';;;';
            let normalName = 'ORG:' + ORG;
            let title = 'TITLE:';
            const tel = item.tel;
            let addItem: string = '';
            addItem += `item1.TEL;waid=${tel}:${formatPhone.format('INTERNATIONAL')}\n`;
            addItem += `item1.X-ABLabel:PONSEL\n`;
            if (item.custom) {
                  for (let i = 2; i - 2 < Object.entries(item.custom).length; i++) {
                        const keys = Object.entries(item.custom)[i - 2][0];
                        const values = Object.entries(item.custom)[i - 2][1];
                        if (/^email$/.test(keys)) {
                              addItem += `item${i}.EMAIL;type=INTERNET:${values}\n`;
                              addItem += `item${i}.X-ABLabel:Rumah\n`;
                        }
                        if (/^website$/.test(keys)) {
                              addItem += `item${i}.URL:${values}\n`;
                              addItem += `item${i}.X-ABLabel:OTHER\n`;
                        }
                        if (/^busines$/.test(keys) && (values as any).enable) {
                              addItem += `X-WA-BIZ-DESCRIPTION:${(values as any).desc}\n`;
                              if (item.custom.busines?.desc) addItem += `X-WA-BIZ-NAME:${FN}\n`;
                        }
                  }
            }
            let endCard = 'END:VCARD';
            const stringFormat = [firstCard, version, name, 'FN:' + FN, normalName, title, addItem, endCard]
                  .join('\n')
                  .trim();
            return {
                  ...{
                        displayName: FN,
                        vcard: stringFormat,
                  },
            };
      }
}
