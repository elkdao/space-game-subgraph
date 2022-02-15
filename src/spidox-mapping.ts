import { Transfer, Spidox } from '../generated/Spidox/Spidox'
import { Contract, Player, SpidoxToken } from '../generated/schema'
import { ADDRESS_ZERO, ONE_BI } from './util/constants'
import { loadGame, tokenIdErc721 } from './util/helpers'
import { initPlayer } from './mna-mapping'

function incrementSpidoxOwned(player: Player): void {
  player.spidoxOwned = player.spidoxOwned.plus(ONE_BI)
}

function decrementSpidoxOwned(player: Player): void {
  player.spidoxOwned = player.spidoxOwned.minus(ONE_BI)
}

const initToken = (event: Transfer): SpidoxToken => {
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeSpidoxId = tokenIdErc721(contractAddress, tokenId)

  const t = new SpidoxToken(compositeSpidoxId)
  t.contract = contractAddress
  t.tokenId = event.params.tokenId
  t.mintTx = event.transaction.hash.toHexString()
  t.mintedAt = event.block.timestamp
  t.owner = event.params.to.toHexString()

  return t
}

export function handleTransfer(event: Transfer): void {
  const callerAddress = event.transaction.from.toHexString()
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeSpidoxId = tokenIdErc721(contractAddress, tokenId)

  const game = loadGame()
  let token = SpidoxToken.load(compositeSpidoxId)
  if (token == null) {
    const contract = Contract.load(contractAddress)

    if (contract == null) {
      const c = new Contract(contractAddress)
      const fp = Spidox.bind(event.address)
      c.name = fp._name
      c.save()
    }

    token = initToken(event)
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
    game.spidoxMinted = game.spidoxMinted.plus(ONE_BI)
    newOwner.spidoxMinted = newOwner.spidoxMinted.plus(ONE_BI)
  } else {
    let prevOwner = Player.load(from)
    if (prevOwner == null) {
      // this should never happen
      prevOwner = initPlayer(from)
      incrementSpidoxOwned(prevOwner)
      game.numPlayers = game.numPlayers.plus(ONE_BI)
    }

    decrementSpidoxOwned(prevOwner)
    prevOwner.save()
  }

  incrementSpidoxOwned(newOwner)
  newOwner.save()

  token.owner = newOwner.id
  token.save()
  game.save()
}
