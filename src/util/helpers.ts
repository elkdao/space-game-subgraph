import { Game } from '../../generated/schema'
import { GAME_ID, ZERO_BI } from './constants'

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
  }

  return game
}
