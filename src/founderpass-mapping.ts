import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { Transfer } from '../generated/FounderPass/FounderPass'
import { Game, Player, Token } from '../generated/schema'
import { ADDRESS_ZERO, ONE_BI, NAME_PASS } from './util/constants'
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
  t.name = NAME_PASS
  t.tokenId = event.params.tokenId
  t.balance = ONE_BI
  t.mintTx = event.transaction.hash.toHexString()
  t.mintedAt = event.block.timestamp
  t.owner = event.params.to.toHexString()
  t.isStaked = false

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
  }

  const from = event.params.from.toHexString()
  const isNewMint = from == ADDRESS_ZERO
  if (isNewMint) {
    const game = loadGame()
    game.founderPassMinted = game.founderPassMinted.plus(ONE_BI)
    game.save()
    newOwner.founderPassMinted = newOwner.founderPassMinted.plus(ONE_BI)
  } else {
    let prevOwner = Player.load(from)
    if (prevOwner == null) {
      // this should never happen
      prevOwner = initPlayer(from)
      prevOwner.tokensOwned = prevOwner.tokensOwned.plus(ONE_BI)
    }

    decrementTokensOwned(prevOwner)
    prevOwner.save()
  }

  incrementTokensOwned(newOwner)
  newOwner.save()

  token.owner = newOwner.id
  token.save()
}