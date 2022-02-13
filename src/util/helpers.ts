import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Game, Trait } from '../../generated/schema'
import { GAME_ID, ONE_BI, ZERO_BI, ZERO_BD, NAME_MARINE, NAME_ALIEN } from './constants'
import { decode } from 'as-base64'

export function tokenIdErc721(contract: string, tokenId: string): string {
  return `${contract}-${tokenId}`
}

export function loadGame(): Game {
  let game = Game.load(GAME_ID)
  if (game == null) {
    game = new Game(GAME_ID)
    game.aliensMinted = ZERO_BI
    game.aliensStaked = ZERO_BI
    game.aliensStolen = ZERO_BI
    game.founderPassMinted = ZERO_BI
    game.marinesMinted = ZERO_BI
    game.marinesStaked = ZERO_BI
    game.marinesStolen = ZERO_BI
    game.oresClaimed = ZERO_BI
    game.numPlayers = ZERO_BI
  }

  return game
}

export function base64Decode(encoded: string): string {
  const array = decode(encoded)

  let str = ''
  for (let i = 0; i < array.length; i++) {
    str = str.concat(String.fromCharCode(array[i]))
  }

  return str
}

export function setRarity(tokenType: string, traitType: string, name: string): void {
  if (tokenType == name) {
    // skip the 'Type' trait
    return
  }

  const game = loadGame()
  let total = ZERO_BI
  if (tokenType == NAME_MARINE) {
    //total = game.marinesMinted
    total = BigInt.fromString('6250')
  } else if (tokenType == NAME_ALIEN) {
    //total = game.aliensMinted
    total = BigInt.fromString('719')
  }

  const id = tokenType.concat('-').concat(name)
  let trait = Trait.load(id)
  if (trait == null) {
    trait = new Trait(id)
    trait.tokenTyp = tokenType
    trait.typ = traitType
    trait.name = name
    trait.count = ZERO_BI
    trait.rarity = ZERO_BD
  }

  trait.count = trait.count.plus(ONE_BI)
  const countBd = trait.count.toBigDecimal()
  const totalBd = total.toBigDecimal()
  trait.rarity = countBd.div(totalBd)

  trait.save()
}
