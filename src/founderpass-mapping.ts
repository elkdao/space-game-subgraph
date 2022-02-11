import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { Transfer } from '../generated/FounderPass/FounderPass'
import { Game, Player, Token } from '../generated/schema'
import { ADDRESS_ZERO, ONE_BI, NAME_PASS, ZERO_BI } from './util/constants'
import { loadGame, tokenIdErc721 } from './util/helpers'
import { initPlayer } from './mna-mapping'

function incrementTokensOwned(player: Player): void {
  player.founderPassOwned = player.founderPassOwned.plus(ONE_BI)
}

function decrementTokensOwned(player: Player): void {
  player.founderPassOwned = player.founderPassOwned.minus(ONE_BI)
}

function initToken(event: Transfer): Token {
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId)

  const t = new Token(compositeTokenId)
  t.contract = contractAddress
  t.typ = NAME_PASS
  t.tokenId = event.params.tokenId
  t.balance = ONE_BI
  t.mintBlock = event.block.number
  t.mintTx = event.transaction.hash.toHexString()
  t.mintedAt = event.block.timestamp
  t.owner = event.params.to.toHexString()
  t.isStaked = false
  t.stakedAt = ZERO_BI

  return t
}

export function handleTransfer(event: Transfer): void {
  const callerAddress = event.transaction.from.toHexString()
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId)

  let token = Token.load(compositeTokenId)
  if (token == null) {
    token = initToken(event)
  }

  const to = event.params.to.toHexString()
  let newOwner = Player.load(to)
  if (newOwner == null) {
    newOwner = initPlayer(to)
    const game = loadGame()
    game.players = game.players.plus(ONE_BI)
  }

  token.owner = newOwner.id
  token.save()
}
