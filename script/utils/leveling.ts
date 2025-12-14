export type Gender = 'male' | 'female'

export type StatusBracket = {
  statusKey: string
  maleTitle: string
  femaleTitle: string
  minLevel: number
  maxLevel: number
  coinCost: number
  streakReq: number
}

export const STATUS_BRACKETS: StatusBracket[] = [
  { statusKey: 'serf', maleTitle: 'Serf', femaleTitle: 'Serf', minLevel: 1, maxLevel: 4, coinCost: 0, streakReq: 0 },
  { statusKey: 'freeman', maleTitle: 'Freeman', femaleTitle: 'Freeman', minLevel: 5, maxLevel: 9, coinCost: 0, streakReq: 1 },
  { statusKey: 'townspeople', maleTitle: 'Merchant', femaleTitle: 'Artisan', minLevel: 10, maxLevel: 14, coinCost: 50, streakReq: 2 },
  { statusKey: 'lord', maleTitle: 'Lord', femaleTitle: 'Lady', minLevel: 15, maxLevel: 19, coinCost: 75, streakReq: 3 },
  { statusKey: 'knight', maleTitle: 'Knight', femaleTitle: 'Dame', minLevel: 20, maxLevel: 24, coinCost: 100, streakReq: 4 },
  { statusKey: 'baronet', maleTitle: 'Baronet', femaleTitle: 'Baronetess', minLevel: 25, maxLevel: 29, coinCost: 150, streakReq: 5 },
  { statusKey: 'baron', maleTitle: 'Baron', femaleTitle: 'Baroness', minLevel: 30, maxLevel: 34, coinCost: 200, streakReq: 6 },
  { statusKey: 'viscount', maleTitle: 'Viscount', femaleTitle: 'Viscountess', minLevel: 35, maxLevel: 39, coinCost: 250, streakReq: 7 },
  { statusKey: 'earl', maleTitle: 'Earl/Count', femaleTitle: 'Countess', minLevel: 40, maxLevel: 44, coinCost: 300, streakReq: 8 },
  { statusKey: 'marquess', maleTitle: 'Marquess', femaleTitle: 'Marchioness', minLevel: 45, maxLevel: 49, coinCost: 400, streakReq: 9 },
  { statusKey: 'duke', maleTitle: 'Duke', femaleTitle: 'Duchess', minLevel: 50, maxLevel: 59, coinCost: 500, streakReq: 10 },
  { statusKey: 'archduke', maleTitle: 'Archduke', femaleTitle: 'Grand Duchess', minLevel: 60, maxLevel: 69, coinCost: 700, streakReq: 12 },
  { statusKey: 'prince', maleTitle: 'Prince', femaleTitle: 'Princess', minLevel: 70, maxLevel: 79, coinCost: 900, streakReq: 14 },
  { statusKey: 'king', maleTitle: 'King', femaleTitle: 'Queen', minLevel: 80, maxLevel: 94, coinCost: 1200, streakReq: 16 },
  { statusKey: 'emperor', maleTitle: 'Emperor', femaleTitle: 'Empress', minLevel: 95, maxLevel: 999, coinCost: 1500, streakReq: 18 },
]

export const REQUIRED_EXP: number[] = [
  0,
  45, 128, 232, 353, 489, 636, 795, 963, 1140, 1325,
  1517, 1716, 1921, 2131, 2348, 2570, 2796, 3027, 3263, 3503,
  3747, 3995, 4248, 4504, 4764, 5028, 5295, 5566, 5840, 6117,
  6398, 6681, 6968, 7257, 7550, 7845, 8143, 8444, 8747, 9053,
  9361, 9671, 9984, 10299, 10616, 10935, 11257, 11580, 11906, 12234,
  16251, 16957, 17676, 18409, 19156, 19918, 20694, 21485, 22292, 23114,
  23951, 24805, 25675, 26562, 27465, 28386, 29324, 30280, 31254, 32246,
  33256, 34286, 35334, 36402, 37489, 38597, 39724, 40872, 42041, 43231,
  44442, 45675, 46930, 48207, 49506, 50829, 52175, 53545, 54939, 56358,
  57801, 59270, 60764, 62285, 63831, 65404, 67004, 68632, 70287, 71970,
  73682, 75422, 77192, 78991, 80820, 82679, 84568, 86489, 88440, 90422,
  92437, 94483, 96562, 98674, 100819, 102998, 105211, 107458, 109740, 112057,
]

export const CUM_EXP: number[] = (() => {
  const arr: number[] = [0]
  for (let i = 1; i < REQUIRED_EXP.length; i++) {
    arr[i] = arr[i - 1] + REQUIRED_EXP[i]
  }
  return arr
})()

export function computeLevel(totalExp: number): number {
  const exp = Math.max(0, Math.floor(totalExp || 0))
  let low = 1
  let high = REQUIRED_EXP.length - 1
  let ans = 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (CUM_EXP[mid] <= exp) {
      ans = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return ans
}

export function clampLevel(level: number, statusKey: string): number {
  const bracket = STATUS_BRACKETS.find((s) => s.statusKey === statusKey)
  if (!bracket) return level
  return Math.max(bracket.minLevel, Math.min(bracket.maxLevel, level))
}

export function statusTitle(statusKey: string, gender: Gender): string {
  const bracket = STATUS_BRACKETS.find((s) => s.statusKey === statusKey)
  if (!bracket) return statusKey
  return gender === 'female' ? bracket.femaleTitle : bracket.maleTitle
}

export function nextStatusKey(statusKey: string): string | null {
  const idx = STATUS_BRACKETS.findIndex((s) => s.statusKey === statusKey)
  if (idx === -1 || idx === STATUS_BRACKETS.length - 1) return null
  return STATUS_BRACKETS[idx + 1].statusKey
}

export function getBracket(statusKey: string): StatusBracket | undefined {
  return STATUS_BRACKETS.find((s) => s.statusKey === statusKey)
}

export function getExpMultiplier(statusKey: string): number {
  const idx = STATUS_BRACKETS.findIndex((s) => s.statusKey === statusKey)
  if (idx === -1) return 1.0
  // Multiplier scales: Serf=1.0x, Freeman=1.2x, Merchant/Artisan=1.4x, ..., Emperor=2.8x
  return 1.0 + (idx * 0.2)
}
