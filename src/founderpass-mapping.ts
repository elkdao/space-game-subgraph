import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { Transfer, FounderPass } from '../generated/FounderPass/FounderPass'
import { Contract, Player, FPToken } from '../generated/schema'
import { ADDRESS_ZERO, ONE_BI, NAME_PASS } from './util/constants'
import { loadGame, tokenIdErc721 } from './util/helpers'
import { initPlayer } from './mna-mapping'

function incrementFPTokensOwned(player: Player): void {
  player.founderPassOwned = player.founderPassOwned.plus(ONE_BI)
}

function decrementFPTokensOwned(player: Player): void {
  player.founderPassOwned = player.founderPassOwned.minus(ONE_BI)
}

function initFPToken(event: Transfer): FPToken {
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeFPTokenId = tokenIdErc721(contractAddress, tokenId)

  const t = new FPToken(compositeFPTokenId)
  t.contract = contractAddress
  t.tokenId = event.params.tokenId
  t.mintTx = event.transaction.hash.toHexString()
  t.mintedAt = event.block.timestamp
  t.owner = event.params.to.toHexString()
  t.claimed = false

  return t
}

export function handleTransfer(event: Transfer): void {
  const callerAddress = event.transaction.from.toHexString()
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeFPTokenId = tokenIdErc721(contractAddress, tokenId)

  const game = loadGame()
  let token = FPToken.load(compositeFPTokenId)
  if (token == null) {
    const contract = Contract.load(contractAddress)
    if (contract == null) {
      const c = new Contract(contractAddress)
      const fp = FounderPass.bind(event.address)
      c.name = fp._name
      c.save()
    }

    token = initFPToken(event)
  }

  const to = event.params.to.toHexString()
  let newOwner = Player.load(to)
  if (newOwner == null) {
    newOwner = initPlayer(to)
    game.numPlayers = game.numPlayers.plus(ONE_BI)
  }

  const from = event.params.from.toHexString()
  const isNewMint = from == ADDRESS_ZERO
  if (isNewMint) {
    game.founderPassMinted = game.founderPassMinted.plus(ONE_BI)
    newOwner.founderPassMinted = newOwner.founderPassMinted.plus(ONE_BI)
    newOwner.numTokensMinted = newOwner.numTokensMinted.plus(ONE_BI)
  } else {
    let prevOwner = Player.load(from)
    if (prevOwner == null) {
      // this should never happen
      prevOwner = initPlayer(from)
      incrementFPTokensOwned(prevOwner)
      game.numPlayers = game.numPlayers.plus(ONE_BI)
    }

    decrementFPTokensOwned(prevOwner)
    prevOwner.save()
  }

  incrementFPTokensOwned(newOwner)
  newOwner.save()

  token.owner = newOwner.id
  token.save()
  game.save()
}
