import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(register|daftar)', {
    as: ['daftar'],
    description: 'Daftar user: register <nama> <male|female>',
    usePrefix: true,
    division: 'helper',
    acc: { owner: false },
    help: 'register <nama> <male|female>'
  })
  async register() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set. Tambahkan ke environment.')

    const name = this.args?.[0]
    const genderRaw = this.args?.[1]?.toLowerCase()
    if (!name || !genderRaw) {
      return this.replyText('Format: register <nama> <male|female>. Contoh: register Andi male')
    }

    const gender = genderRaw === 'male' || genderRaw === 'laki' || genderRaw === 'laki-laki' ? 'male' :
      genderRaw === 'female' || genderRaw === 'perempuan' || genderRaw === 'wanita' ? 'female' : null
    if (!gender) return this.replyText('Gender harus male atau female.')

    try {
      const store = await getLevelingStore()
      const player = await store.registerPlayer(this.M.sender as string, name, gender)
      return this.replyText(
        `Pendaftaran berhasil!\nNama: ${player.name}\nGender: ${player.gender}\nStatus: ${player.status_display}\nLevel Cap: ${player.bracket_max_level}`
      )
    } catch (err: any) {
      return this.replyText(`Gagal daftar: ${err?.message || err}`)
    }
  }
}
