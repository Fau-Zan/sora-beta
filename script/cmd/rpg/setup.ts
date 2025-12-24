import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'
import { getEquipmentStore } from '../../database/postgres/equipment'
import { getAvailableClasses, getClassRequiredLevel, getElementDescription } from '../../utils/formula'

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(setup|build)', {
    as: ['setup', 'build'],
    description: 'Setup class dan element karakter',
    usePrefix: true,
    division: 'rpg',
    acc: { owner: false },
  })
  async setupCharacter() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set.')

    const jid = this.M.sender as string

    try {
      const store = await getLevelingStore()
      const equipmentStore = await getEquipmentStore()

      const player = await store.getPlayer(jid)
      if (!player || !player.is_registered) {
        return this.replyText('Kamu belum terdaftar. Gunakan /register terlebih dahulu.')
      }

      const classInfo = await equipmentStore.getClassInfo(jid)
      const currentClass = classInfo?.current_class || 'None'
      const currentElement = classInfo?.selected_element || 'None'

      const availableClasses = getAvailableClasses(player.level)

      let setupMessage = `
╔════════════════════════════════╗
║  ⚔️  CHARACTER SETUP  ⚔️        ║
╚════════════════════════════════╝

👤 ${player.name} (Level ${player.level})

┌─ CURRENT CONFIG
├─ Class: ${currentClass}
└─ Element: ${currentElement}

┌─ AVAILABLE CLASSES
`

      availableClasses.forEach((cls, idx) => {
        const requiredLevel = getClassRequiredLevel(cls as any)
        const isUnlocked = player.level >= requiredLevel
        const status = isUnlocked ? '✅' : '🔒'
        setupMessage += `├─ ${status} ${idx + 1}. ${cls}\n`
      })

      setupMessage += `
┌─ AVAILABLE ELEMENTS
├─ 1. Pyro  🔥 (Strong: Aero, Weak: Aqua)
├─ 2. Aqua  💧 (Strong: Pyro, Weak: Aero)
├─ 3. Geo   🏔️ (Strong: Volt, Weak: Aero)
├─ 4. Aero  💨 (Strong: Aqua & Geo, Weak: Pyro)
├─ 5. Volt  ⚡ (Strong: Aqua, Weak: Geo)
├─ 6. None  ⚪ (Normal damage, no bonus)
└─

📌 CARA PAKAI:
/class [nama] → Ganti class
/element [nama] → Ganti element
/setup → Lihat menu ini lagi

Contoh:
/class archer
/element pyro
`.trim()

      return this.replyText(setupMessage)
    } catch (err: any) {
      return this.replyText(`Error: ${err?.message || err}`)
    }
  }

  @Cmd('(class|kelas)', {
    as: ['class'],
    description: 'Ganti class karakter',
    usePrefix: true,
    division: 'rpg',
    acc: { owner: false },
  })
  async switchClass() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set.')

    try {
      const jid = this.M.sender as string
      const classInput = this.args[0]?.toLowerCase()

      if (!classInput) {
        return this.replyText('Format: /class [nama_class]\nClasses: swordsman, archer, spear, mage, ranger')
      }

      const validClasses = ['swordsman', 'archer', 'spear', 'mage', 'ranger']
      const selectedClass = validClasses.find((c) => c.includes(classInput))

      if (!selectedClass) {
        return this.replyText(`❌ Class tidak ditemukan!\nPilih dari: ${validClasses.join(', ')}`)
      }

      const store = await getLevelingStore()
      const equipmentStore = await getEquipmentStore()

      const player = await store.getPlayer(jid)
      if (!player) {
        return this.replyText('Kamu belum terdaftar.')
      }

      const availableClasses = getAvailableClasses(player.level)
      const classCapitalized = selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1)

      if (!availableClasses.includes(classCapitalized as any)) {
        const requiredLevel = getClassRequiredLevel(classCapitalized as any)
        const levelsNeeded = requiredLevel - player.level
        return this.replyText(
          `❌ ${classCapitalized} hanya bisa digunakan di level ${requiredLevel}.\n📍 Kamu level ${player.level}, perlu ${levelsNeeded} level lagi!`
        )
      }

      await equipmentStore.setClass(jid, classCapitalized)
      return this.replyText(
        `✅ Berhasil berganti ke class ${classCapitalized}!\n\nGunakan /element untuk memilih element yang cocok.`
      )
    } catch (err: any) {
      return this.replyText(`❌ Gagal mengganti class: ${err?.message || err}`)
    }
  }

  @Cmd('(element|elemen)', {
    as: ['element'],
    description: 'Pilih element untuk pertempuran (opsional)',
    usePrefix: true,
    division: 'rpg',
    acc: { owner: false },
  })
  async selectElement() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set.')

    try {
      const jid = this.M.sender as string
      const elementInput = this.args[0]?.toLowerCase()

      if (!elementInput) {
        const elementList = 'pyro, aqua, geo, aero, volt, none'
        return this.replyText(
          `Format: /element [nama_element]\n\nElements: ${elementList}\n\nAtau /setup untuk lihat detail.`
        )
      }

      const validElements = ['pyro', 'aqua', 'geo', 'aero', 'volt', 'none']
      const selectedElement = validElements.find((e) => e.includes(elementInput))

      if (!selectedElement) {
        return this.replyText(`❌ Element tidak ditemukan!\nPilih dari: ${validElements.join(', ')}`)
      }

      const equipmentStore = await getEquipmentStore()

      const elementCapitalized =
        selectedElement === 'none' ? null : selectedElement.charAt(0).toUpperCase() + selectedElement.slice(1)

      await equipmentStore.setElement(jid, elementCapitalized)

      if (elementCapitalized) {
        const desc = getElementDescription(elementCapitalized as any)
        return this.replyText(`✅ Berhasil pilih element ${elementCapitalized}!\n\n${desc}`)
      } else {
        return this.replyText(
          `✅ Element dihapus!\n\nKamu sekarang menggunakan Normal damage (tanpa bonus/malus dari element advantage).`
        )
      }
    } catch (err: any) {
      return this.replyText(`❌ Gagal memilih element: ${err?.message || err}`)
    }
  }
}
