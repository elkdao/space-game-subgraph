import { Address, BigInt, log, json } from '@graphprotocol/graph-ts'
import { AlienMinted, Transfer, MarineMinted, MnA } from '../generated/MnA/MnA'

import { Contract, Player, Token, FPToken } from '../generated/schema'

import {
  ADDRESS_ZERO,
  CONTRACT_PASS,
  NAME_ALIEN,
  NAME_MARINE,
  ONE_BI,
  ZERO_BI,
  TRAIT_TYPE,
  TRAIT_VALUE
} from './util/constants'
import { base64Decode, loadGame, setRarity, tokenIdErc721 } from './util/helpers'
import { getObject, getArray, getString, setTrait } from './util/json'

export function initPlayer(id: string): Player {
  const player = new Player(id)
  player.aliensLost = ZERO_BI
  player.aliensOwned = ZERO_BI
  player.aliensMinted = ZERO_BI
  player.aliensStaked = ZERO_BI
  player.aliensStolen = ZERO_BI
  player.founderPassOwned = ZERO_BI
  player.founderPassMinted = ZERO_BI
  player.numTokensOwned = ZERO_BI
  player.numTokensLost = ZERO_BI
  player.numTokensStaked = ZERO_BI
  player.numTokensStolen = ZERO_BI
  player.marinesLost = ZERO_BI
  player.marinesOwned = ZERO_BI
  player.marinesMinted = ZERO_BI
  player.marinesStaked = ZERO_BI
  player.marinesStolen = ZERO_BI
  player.oresClaimed = ZERO_BI
  player.numTokensMinted = ZERO_BI

  return player
}

function initToken(
  contractAddress: string,
  id: string,
  tokenId: BigInt,
  typ: string,
  owner: string,
  tx: string,
  mintedAt: BigInt,
  block: BigInt,
  metadata: string
): Token {
  const token = new Token(id)
  token.contract = contractAddress
  token.typ = typ
  token.tokenId = tokenId
  token.balance = ONE_BI
  token.owner = owner
  token.isStaked = false
  token.stakedAt = ZERO_BI
  token.mintBlock = block
  token.mintTx = tx
  token.mintedAt = mintedAt
  token.metadata = metadata

  return token
}

function incrementTokensOwned(player: Player, token: Token): void {
  player.numTokensOwned = player.numTokensOwned.plus(ONE_BI)
  if (token.typ == NAME_MARINE) {
    player.marinesOwned = player.marinesOwned.plus(ONE_BI)
  } else {
    player.aliensOwned = player.aliensOwned.plus(ONE_BI)
  }
}

function decrementTokensOwned(player: Player, token: Token): void {
  player.numTokensOwned = player.numTokensOwned.minus(ONE_BI)
  if (token.typ == NAME_MARINE) {
    player.marinesOwned = player.marinesOwned.minus(ONE_BI)
  } else {
    player.aliensOwned = player.aliensOwned.minus(ONE_BI)
  }
}

function handleTokenMinted(
  block: BigInt,
  tx: string,
  timestamp: BigInt,
  callerAddress: string,
  contractAddress: Address,
  tokenId: BigInt,
  typ: string
): void {
  const compositeTokenId = tokenIdErc721(contractAddress.toHexString(), tokenId.toString())

  let caller = Player.load(callerAddress)
  if (caller == null) {
    caller = initPlayer(callerAddress)
    const game = loadGame()
    game.numPlayers = game.numPlayers.plus(ONE_BI)
    game.save()
  }

  if (typ == NAME_ALIEN) {
    caller.aliensMinted = caller.aliensMinted.plus(ONE_BI)
  } else {
    caller.marinesMinted = caller.marinesMinted.plus(ONE_BI)
  }

  caller.numTokensMinted = caller.numTokensMinted.plus(ONE_BI)
  caller.save()

  const token = initToken(
    contractAddress.toHexString(),
    compositeTokenId,
    tokenId,
    typ,
    caller.id,
    tx,
    timestamp,
    block,
    ''
  )

  token.save()
}

export function handleAlienMinted(event: AlienMinted): void {
  const callerAddress = event.transaction.from.toHexString()
  const contractAddress = event.address
  const tokenId = event.params.tokenId
  handleTokenMinted(
    event.block.number,
    event.transaction.hash.toHexString(),
    event.block.timestamp,
    callerAddress,
    contractAddress,
    tokenId,
    NAME_ALIEN
  )

  const game = loadGame()
  game.aliensMinted = game.aliensMinted.plus(ONE_BI)
  game.save()

  const contract = Contract.load(contractAddress.toHexString())
  if (contract == null) {
    const c = new Contract(contractAddress.toHexString())
    const mna = MnA.bind(contractAddress)
    c.name = mna._name
    c.save()
  }
}

export function handleMarineMinted(event: MarineMinted): void {
  const callerAddress = event.transaction.from.toHexString()
  const contractAddress = event.address

  const tokenId = event.params.tokenId
  handleTokenMinted(
    event.block.number,
    event.transaction.hash.toHexString(),
    event.block.timestamp,
    callerAddress,
    contractAddress,
    tokenId,
    NAME_MARINE
  )

  const game = loadGame()
  game.marinesMinted = game.marinesMinted.plus(ONE_BI)
  game.save()
}

export function handleTransfer(event: Transfer): void {
  const callerAddress = event.transaction.from.toHexString()
  const contractAddress = event.address.toHexString()
  const tokenId = event.params.tokenId.toString()
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId)

  const token = Token.load(compositeTokenId)
  if (token == null) {
    throw new Error(`Token (${compositeTokenId}) should have been created in mint event`)
  }

  const to = event.params.to.toHexString()
  if (token.owner == to) {
    // Token is being unstaked from the StakingPool, noop
    return
  }

  let newOwner = Player.load(to)
  if (newOwner == null) {
    newOwner = initPlayer(to)
    const game = loadGame()
    game.numPlayers = game.numPlayers.plus(ONE_BI)
    game.save()
  }

  const from = event.params.from.toHexString()
  let prevOwner = Player.load(from)
  const isNewMint = from == ADDRESS_ZERO
  if (!isNewMint) {
    if (prevOwner == null) {
      // this should never happen
      prevOwner = initPlayer(from)
      prevOwner.numTokensOwned = prevOwner.numTokensOwned.plus(ONE_BI)
    }

    decrementTokensOwned(prevOwner, token)
  } else if (to != callerAddress && to != contractAddress) {
    // This token was stolen, update token.thief now that we know who it is
    token.thief = to

    // increment aliens / marines stolen
    if (token.typ == NAME_MARINE) {
      newOwner.aliensStolen = newOwner.aliensStolen.plus(ONE_BI)
    } else {
      newOwner.marinesStolen = newOwner.marinesStolen.plus(ONE_BI)
    }

    newOwner.numTokensStolen = newOwner.numTokensStolen.plus(ONE_BI)

    if (prevOwner == null) {
      prevOwner = initPlayer(from)
    }

    prevOwner.numTokensLost = prevOwner.numTokensLost.plus(ONE_BI)
  }

  incrementTokensOwned(newOwner, token)
  newOwner.save()

  if (prevOwner != null) {
    prevOwner.save()
  }

  // Handle FounderPass Claiming
  if (from == contractAddress) {
    // This is a claim
    const fpContract = Contract.load(CONTRACT_PASS)
    if (fpContract == null) {
      log.info('Could not load FounderPass contract', [])
    } else {
      // Load the corresponding FP token and mark it claimed
      const tokenId = CONTRACT_PASS.concat('-').concat(event.params.tokenId.toString())
      const fpToken = FPToken.load(tokenId)
      if (fpToken == null) {
        log.info('Could not load FounderPass token: {}', [tokenId])
      } else {
        fpToken.claimed = true
        fpToken.save()
      }
    }
  }

  // Get metadata
  if (token.metadata == null || token.metadata == '') {
    const contract = MnA.bind(event.address)

    // Try to pull token URI from contract
    const result = contract.try_tokenURI(event.params.tokenId)
    if (result.reverted) {
      log.info('Could not fetch tokenURI for tokenId {}', [tokenId.toString()])
    } else {
      // trim MIME_TYPE
      const base64 = result.value.slice(29, result.value.length)
      const meta = base64Decode(base64)

      if (meta != null) {
        // Parse the base64 decoded json
        const parsed = json.try_fromString(meta)
        if (parsed.isError) {
          log.info('Could not parse json', [])
        } else {
          // Map attributes to token fields
          const metadata = getObject(parsed.value)
          const attributes = getArray(metadata.get('attributes'))

          for (let i = 0; i < attributes.length; i++) {
            const trait = getObject(attributes[i])
            const name = getString(trait.get(TRAIT_TYPE))
            const value = getString(trait.get(TRAIT_VALUE))
            setTrait(token, name, value)
            setRarity(token.typ, name, value)
          }
        }
      }
    }
  }

  token.owner = newOwner.id
  token.save()
}
