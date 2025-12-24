import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'
import { getEquipmentStore } from '../../database/postgres/equipment'
import {
  calculateDamage,
  CombatStats,
  getElementAdvantageMultiplier,
  getClassRequiredLevel,
  CLASS_STATS,
  getElementDescription,
  Element,
} from '../../utils/formula'
import {
  createHuntSession,
  executeTurn,
  fleeHunt,
  getHuntSummary,
  getAvailableMonsters,
  HuntSession,
  Monster,
} from '../../utils/hunting'
import { applyFableBuffs } from '../../utils/leveling'

const activeSessions = new Map<string, HuntSession>()

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(hunt)', {
    as: ['hunt'],
    description: 'Mulai hunting (turnbase)',
    usePrefix: true,
    division: 'hunting',
    acc: { owner: false },
  })
  async startHunt() {
    const jid = this.M.sender as string
    const monsterInput = this.args[0]?.toLowerCase()

    try {
      const store = await getLevelingStore()
      const player = await store.getPlayer(jid)

      if (!player || !player.is_registered) {
        return this.replyText('❌ Kamu belum terdaftar. Gunakan /register terlebih dahulu.')
      }

      if (activeSessions.has(jid)) {
        return this.replyText('❌ Kamu sedang hunting! Selesaikan dulu atau /flee.')
      }

      const availableMonsters = getAvailableMonsters(player.level)

      if (availableMonsters.length === 0) {
        return this.replyText(`❌ Tidak ada monster yang sesuai untuk level ${player.level}.`)
      }

      let selectedMonster: Monster | undefined

      if (monsterInput) {
        selectedMonster = availableMonsters.find((m) => m.name.toLowerCase().includes(monsterInput))
        if (!selectedMonster) {
          const monsterList = availableMonsters.map((m) => `${m.name} (Lvl ${m.level})`).join('\n  ')
          return this.replyText(`❌ Monster tidak ditemukan!\n\n📋 Available:\n  ${monsterList}`)
        }
      } else {
        selectedMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)]
      }

      const equipmentStore = await getEquipmentStore()
      let classInfo = await equipmentStore.getClassInfo(jid)
      
      if (!classInfo) {
        await equipmentStore.setClass(jid, 'None')
        classInfo = await equipmentStore.getClassInfo(jid)
      }

      const classStats = classInfo?.current_class && classInfo.current_class !== 'None' ? CLASS_STATS[classInfo.current_class as any] : {}
      
      console.log(`[HUNT START DEBUG] classInfo:`, classInfo, 'classStats:', classStats)
      
      const characterStats: CombatStats = {
        level: player.level,
        baseAtk: classStats.baseAtk || 20,
        atkPercent: classStats.atkPercent || 10,
        flatAtkBonus: classStats.flatAtkBonus || 5,
        critDamage: classStats.critDamage || 50,
        element: (classInfo?.selected_element as Element) || 'Pyro',
        elementalDamageBonus: 10,
        physicalDamageBonus: 10,
        defense: classStats.defense || 10,
        hp: classStats.hp || 100,
      }
      
      console.log(`[HUNT START DEBUG] characterStats.hp:`, characterStats.hp)

      const session = createHuntSession(jid, characterStats, selectedMonster)
      activeSessions.set(jid, session)

      const huntStart = `
╔════════════════════════════════╗
║  🎯 HUNT STARTED 🎯            ║
╚════════════════════════════════╝

⚔️  vs ${selectedMonster.name} [${selectedMonster.rarity}]
   Level: ${selectedMonster.level}
   Element: ${selectedMonster.element}

👤 ${player.name}
   HP: ${characterStats.hp}/${characterStats.hp}

🎪 Monster
   HP: ${session.monsterHp}

Commands:
/attack  - Attack monster
/defend  - Defend (reduce damage next turn)
/flee    - Try to flee (40% success)
/status  - Check HP status
`.trim()

      return this.replyText(huntStart)
    } catch (err: any) {
      return this.replyText(`❌ Error starting hunt: ${err?.message || err}`)
    }
  }

  @Cmd('(attack)', {
    as: ['attack'],
    description: 'Attack monster dalam hunting',
    usePrefix: true,
    division: 'hunting',
    acc: { owner: false },
  })
  async attack() {
    const jid = this.M.sender as string

    try {
      const session = activeSessions.get(jid)
      if (!session) {
        return this.replyText('❌ Kamu tidak sedang hunting. Gunakan /hunt untuk memulai.')
      }

      if (session.status !== 'ongoing') {
        return this.replyText(`❌ Hunt sudah selesai! Status: ${session.status.toUpperCase()}`)
      }

      const store = await getLevelingStore()
      const player = await store.getPlayer(jid)
      if (!player) return this.replyText('❌ Player tidak ditemukan.')

      const equipmentStore = await getEquipmentStore()
      const classInfo = await equipmentStore.getClassInfo(jid)
      const classStats = classInfo?.current_class ? CLASS_STATS[classInfo.current_class as any] : {}

      console.log(`[HUNT DEBUG] jid: ${jid}, classInfo:`, classInfo, 'classStats:', classStats)

      const characterStats: CombatStats = {
        level: player.level,
        baseAtk: classStats.baseAtk || 20,
        atkPercent: classStats.atkPercent || 10,
        flatAtkBonus: classStats.flatAtkBonus || 5,
        critDamage: classStats.critDamage || 50,
        element: (classInfo?.selected_element as Element) || 'Pyro',
        elementalDamageBonus: 10,
        physicalDamageBonus: 10,
        defense: classStats.defense || 10,
        hp: classStats.hp || 100,
      }

      const elementAdvantage = getElementAdvantageMultiplier(
        characterStats.element,
        session.monster.element
      )

      const turnLogs = await executeTurn(session, characterStats, elementAdvantage)

      let result = `\n🎯 Turn ${session.turn}\n`

      for (const log of turnLogs) {
        if (log.actor === 'character') {
          const dmgText = log.isCrit ? `💥 CRITICAL!` : '⚔️ Hit'
          result += `${dmgText}\n`
          
          if (log.damage) {
            const dmg = log.damage
            result += `┌─ Breakdown\n`
            result += `├─ Base DMG: ${dmg.baseDamage}\n`
            
            if (dmg.breakdown && dmg.breakdown.length > 0) {
              for (const line of dmg.breakdown) {
                if (line.includes('Element:') && !line.includes('isElemental')) {
                  result += `├─ ${line}\n`
                }
                if (line.includes('Resistance:')) {
                  result += `├─ ${line.split('(')[0].trim()}\n`
                }
                if (line.includes('Level scaling:')) {
                  result += `├─ ${line}\n`
                }
                if (line.includes('Element advantage')) {
                  result += `├─ ${line}\n`
                }
              }
            }
            
            result += `└─ Final DMG: ${dmg.finalDamage}\n`
          }
          
          result += `→ Monster HP: ${log.hpAfter}\n`
        } else {
          const dmgText = log.isCrit ? `💥 CRITICAL!` : '🎪 Attack'
          result += `${dmgText}\nDamage: ${log.damage?.finalDamage} → Your HP: ${log.hpAfter}\n`
        }
      }

      // Check win/lose
      if ((session.status as any) === 'won') {
        result += `\n✅ VICTORY! Monster defeated!\n`
        result += `EXP: +${session.rewards?.exp}\n`
        result += `Coins: +${session.rewards?.coins}\n`
        result += `Gems: +${session.rewards?.gems}`

        // Award player
        if (session.rewards) {
          await store.addExp(jid, session.rewards.exp, 0, session.rewards.coins)
          await store.adminAdjust(jid, { gems: Math.max(0, player.gems + session.rewards.gems) })
        }

        activeSessions.delete(jid)
      } else if ((session.status as any) === 'lost') {
        result += `\n❌ DEFEATED! You were knocked out!`
        activeSessions.delete(jid)
      }

      return this.replyText(result)
    } catch (err: any) {
      return this.replyText(`❌ Error: ${err?.message || err}`)
    }
  }

  @Cmd('(flee|run)', {
    as: ['flee', 'run'],
    description: 'Lari dari hunt (40% success)',
    usePrefix: true,
    division: 'hunting',
    acc: { owner: false },
  })
  async flee() {
    const jid = this.M.sender as string

    try {
      const session = activeSessions.get(jid)
      if (!session) {
        return this.replyText('❌ Kamu tidak sedang hunting.')
      }

      if (session.status !== 'ongoing') {
        return this.replyText(`❌ Hunt sudah selesai!`)
      }

      const success = fleeHunt(session)

      if (success) {
        activeSessions.delete(jid)
        return this.replyText(`✅ Berhasil lari dari ${session.monster.name}!`)
      } else {
        return this.replyText(`❌ Gagal lari! Monster blocks your escape!`)
      }
    } catch (err: any) {
      return this.replyText(`❌ Error: ${err?.message || err}`)
    }
  }

  @Cmd('(status)', {
    as: ['status'],
    description: 'Lihat HP status hunt',
    usePrefix: true,
    division: 'hunting',
    acc: { owner: false },
  })
  async status() {
    const jid = this.M.sender as string

    try {
      const session = activeSessions.get(jid)
      if (!session) {
        return this.replyText('❌ Kamu tidak sedang hunting.')
      }

      const hpBarLength = 20
      const charHpPercent = Math.floor(Math.max(0, (session.characterHp / 100) * hpBarLength))
      const monsterHpPercent = Math.floor(Math.max(0, (session.monsterHp / 200) * hpBarLength))

      const charHpBar = '█'.repeat(charHpPercent) + '░'.repeat(Math.max(0, hpBarLength - charHpPercent))
      const monsterHpBar = '█'.repeat(monsterHpPercent) + '░'.repeat(Math.max(0, hpBarLength - monsterHpPercent))

      const statusMsg = `
╔════════════════════════════════╗
║  STATUS  ⚔️                     ║
╚════════════════════════════════╝

👤 Your HP
[${charHpBar}] ${Math.max(0, session.characterHp)}/100

🎪 ${session.monster.name}
[${monsterHpBar}] ${Math.max(0, session.monsterHp)}/200

Turn: ${session.turn}

/attack /defend /flee
`.trim()

      return this.replyText(statusMsg)
    } catch (err: any) {
      return this.replyText(`❌ Error: ${err?.message || err}`)
    }
  }
}
