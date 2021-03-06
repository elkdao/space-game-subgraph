import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { AlienClaimed, MarineClaimed, TokenStaked } from '../generated/StakingPool/StakingPool'
import { Game, Player, Token } from '../generated/schema'
import { loadGame, tokenIdErc721 } from './util/helpers'
import { MNA_CONTRACT, ONE_BI, ZERO_BI } from './util/constants'

export function handleTokenStaked(event: TokenStaked): void {
  const owner = event.params.owner.toHexString()
  const tokenId = event.params.tokenId
  const isMarine = event.params.isMarine
  const compositeTokenId = tokenIdErc721(MNA_CONTRACT, tokenId.toString())

  const player = Player.load(owner)
  if (player == null) {
    throw new Error('Cannot stake token if player does not exist')
  }

  const token = Token.load(compositeTokenId)
  if (token == null) {
    throw new Error('Cannot stake if token does not exist')
  }

  // Transfer is emitted before this and the token is staked with the StakingPool contract
  // Therefore the owner must be reset to be the original owner
  token.owner = owner
  token.isStaked = true
  token.stakedAt = event.block.timestamp
  token.save()

  const game = loadGame()
  if (isMarine) {
    game.marinesStaked = game.marinesStaked.plus(ONE_BI)
    player.marinesStaked = player.marinesStaked.plus(ONE_BI)
  } else {
    game.aliensStaked = game.aliensStaked.plus(ONE_BI)
    player.aliensStaked = player.aliensStaked.plus(ONE_BI)
  }

  player.numTokensStaked = player.numTokensStaked.plus(ONE_BI)

  player.save()
  game.save()
}

function handleClaim(isMarine: boolean, tokenId: string, isUnstaked: boolean, oresClaimed: BigInt): void {
  const compositeTokenId = tokenIdErc721(MNA_CONTRACT, tokenId.toString())
  const token = Token.load(compositeTokenId)
  if (token == null) {
    throw new Error('Cannot claim if token does not exist')
  }

  const player = Player.load(token.owner)
  if (player == null) {
    throw new Error('Cannot claim if owner does not exist')
  }

  const game = loadGame()
  if (isUnstaked) {
    token.isStaked = false
    token.stakedAt = ZERO_BI
    token.save()

    if (isMarine) {
      game.marinesStaked = game.marinesStaked.minus(ONE_BI)
      player.marinesStaked = player.marinesStaked.minus(ONE_BI)
    } else {
      game.aliensStaked = game.aliensStaked.minus(ONE_BI)
      player.aliensStaked = player.aliensStaked.minus(ONE_BI)
    }

    player.numTokensStaked = player.numTokensStaked.minus(ONE_BI)
  }

  game.oresClaimed = game.oresClaimed.plus(oresClaimed)
  game.save()

  player.oresClaimed = player.oresClaimed.plus(oresClaimed)
  player.save()

  token.oresClaimed = token.oresClaimed.plus(oresClaimed)
  token.save()
}

export function handleAlienClaimed(event: AlienClaimed): void {
  const tokenId = event.params.tokenId.toString()
  const isUnstaked = event.params.unstaked
  const oresClaimed = event.params.earned

  handleClaim(false, tokenId, isUnstaked, oresClaimed)
}

export function handleMarineClaimed(event: MarineClaimed): void {
  const tokenId = event.params.tokenId.toString()
  const isUnstaked = event.params.unstaked
  const oresClaimed = event.params.earned

  handleClaim(true, tokenId, isUnstaked, oresClaimed)
}
