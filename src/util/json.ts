import { BigInt, log } from '@graphprotocol/graph-ts'
import { JSONValue, JSONValueKind, TypedMap } from '@graphprotocol/graph-ts'
import { Token } from '../../generated/schema'

export function getObject(value: JSONValue | null): TypedMap<string, JSONValue> {
  if (value != null && value.kind == JSONValueKind.OBJECT) {
    const parsed = value.toObject()

    if (parsed != null) {
      return parsed
    }
  }
  throw new Error('JSONValue was not an object')
}

export function getArray(value: JSONValue | null): JSONValue[] {
  if (value != null && value.kind == JSONValueKind.ARRAY) {
    const parsed = value.toArray()

    if (parsed != null) {
      return parsed
    }
  }

  throw new Error('JSONValue was not an array')
}

export function getString(value: JSONValue | null): string {
  if (value != null && value.kind == JSONValueKind.STRING) {
    const parsed = value.toString()

    if (parsed != null) {
      return parsed
    }
  }

  throw new Error('JSONValue was not an string')
}

const traitMap = new Map<string, string>()
traitMap.set('A_Eyes', 'emblemEye')
traitMap.set('A_Back', 'back')
traitMap.set('A_Body', 'body')
traitMap.set('A_Mouth', 'weaponMouth')
traitMap.set('A_Headgear', 'head')
traitMap.set('M_Emblem', 'emblemEye')
traitMap.set('M_Back', 'back')
traitMap.set('M_Body', 'body')
traitMap.set('M_Weapon', 'weaponMouth')
traitMap.set('M_Headgear', 'head')
export function traitToProp(trait: string): string {
  const prop = traitMap.get(trait)
  if (prop == null) {
    throw new Error('Parsed trait is not mapped to a field: '.concat(trait))
  }

  return prop
}

const alienRank = 'Rank Score'
const alienEye = 'A_Eye'
const alienBack = 'A_Back'
const alienBody = 'A_Body'
const alienMouth = 'A_Mouth'
const alienHead = 'A_Headgear'
const marineEye = 'M_Eyes'
const marineEmblem = 'M_Emblem'
const marineBack = 'M_Back'
const marineBody = 'M_Body'
const marineWeapon = 'M_Weapon'
const marineHead = 'M_Headgear'
const generation = 'Generation'
const tokenType = 'Type'
export function setTrait(token: Token, name: string, value: string): void {
  if (name == alienEye || name == marineEye) {
    token.eyes = value
  } else if (name == alienBack || name == marineBack) {
    token.back = value
  } else if (name == alienBody || name == marineBody) {
    token.body = value
  } else if (name == alienMouth || name == marineWeapon) {
    token.weaponMouth = value
  } else if (name == alienHead || name == marineHead) {
    token.headgear = value
  } else if (name == alienRank) {
    token.rank = BigInt.fromString(value)
  } else if (name == marineEmblem) {
    token.emblem = value
  } else if (name == generation) {
    token.generation = value
  } else if (name == tokenType) {
    // noop
  } else {
    log.warning('Could not map property to field: {} {}', [name, value])
  }
}
