import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import {
  AlienBurned,
  AlienMinted,
  AlienStolen,
  Transfer,
  MarineBurned,
  MarineMinted,
  MarineStolen,
} from '../generated/MnA/MnA'

import { Game, Player, Token, StolenToken } from '../generated/schema'

import {
  ADDRESS_ZERO,
  GAME_ID,
  NAME_ALIEN,
  NAME_MARINE,
  ONE_BI,
  STAKING_POOL_CONTRACTS,
  ZERO_BI,
} from './util/constants'
import { loadGame, tokenIdErc721 } from './util/helpers';

function initPlayer(id: string): Player {
  const player = new Player(id);
  player.aliensLost = ZERO_BI;
  player.aliensOwned = ZERO_BI;
  player.aliensMinted = ZERO_BI;
  player.aliensStaked = ZERO_BI;
  player.aliensStolen = ZERO_BI;
  player.tokensOwned = ZERO_BI;
  player.marinesLost = ZERO_BI;
  player.marinesOwned = ZERO_BI;
  player.marinesMinted = ZERO_BI;
  player.marinesStaked = ZERO_BI;
  player.marinesStolen = ZERO_BI;
  player.oresClaimed = ZERO_BI;
  player.mints = ZERO_BI;

  return player;
}

function initToken(id: string, tokenId: BigInt, name: string, owner: string, tx: string): Token {
  const token = new Token(id);
  token.name = name;
  token.tokenId = tokenId;
  token.balance = ONE_BI;
  token.owner = owner;
  token.isStaked = false;
  token.stakedAt = ZERO_BI;
  token.mintTx = tx;

  return token;
};

function incrementTokensOwned(player: Player, token: Token): void {
  player.tokensOwned = player.tokensOwned.plus(ONE_BI);
  if (token.name == NAME_MARINE) {
    player.marinesOwned = player.marinesOwned.plus(ONE_BI);
  } else {
    player.aliensOwned = player.aliensOwned.plus(ONE_BI);
  }
}

function decrementTokensOwned(player: Player, token: Token): void {
  player.tokensOwned = player.tokensOwned.minus(ONE_BI);
  if (token.name == NAME_MARINE) {
    player.marinesOwned = player.marinesOwned.minus(ONE_BI);
  } else {
    player.aliensOwned = player.aliensOwned.minus(ONE_BI);
  }
}

function handleTokenMinted(
  tx: string,
  callerAddress: string,
  contractAddress: string,
  tokenId: BigInt,
  name: string,
): void {
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId.toString());

  let caller = Player.load(callerAddress);
  if (caller == null) {
    caller = initPlayer(callerAddress);
  }

  if (name === NAME_ALIEN) {
    caller.aliensMinted = caller.aliensMinted.plus(ONE_BI);
  } else {
    caller.marinesMinted = caller.marinesMinted.plus(ONE_BI);
  }

  caller.mints = caller.mints.plus(ONE_BI);
  caller.save();

  const token = initToken(
    compositeTokenId,
    tokenId,
    name,
    caller.id,
    tx,
  );

  token.save();
}

export function handleAlienMinted(event: AlienMinted): void {
  const callerAddress = event.transaction.from.toHexString();
  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId;
  const tx = event.transaction.hash.toHexString();
  handleTokenMinted(tx, callerAddress, contractAddress, tokenId, NAME_ALIEN);

  const game = loadGame();
  game.aliensMinted = game.aliensMinted.plus(ONE_BI);
  game.save();
}

export function handleMarineMinted(event: MarineMinted): void {
  const callerAddress = event.transaction.from.toHexString();
  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId;
  const tx = event.transaction.hash.toHexString();
  handleTokenMinted(tx, callerAddress, contractAddress, tokenId, NAME_MARINE);

  const game = loadGame();
  game.marinesMinted = game.marinesMinted.plus(ONE_BI);
  game.save();
}

function initStolenToken(
  id: string,
  tokenId: BigInt,
  victim: string,
  mintTx: string,
  isMarine: boolean,
): StolenToken {
  const stolenToken = new StolenToken(id);
  stolenToken.tokenId = tokenId;
  stolenToken.thief = ''; // unknown at this point
  stolenToken.victim = victim;
  stolenToken.mintTx = mintTx;
  stolenToken.name = isMarine ? NAME_MARINE : NAME_ALIEN;

  return stolenToken;
}

function handleAlienStolen(event: AlienStolen): void {
  const callerAddress = event.transaction.from.toHexString();
  let caller = Player.load(callerAddress);
  if (caller == null) {
    caller = initPlayer(callerAddress);
  }
  caller.aliensLost = caller.aliensLost.plus(ONE_BI);
  caller.save();

  const game = loadGame();
  game.aliensStolen = game.aliensStolen.plus(ONE_BI);
  game.save();


  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId;
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId.toString());
  const stolenToken = initStolenToken(compositeTokenId, tokenId, callerAddress, event.transaction.hash.toString(), false);
  stolenToken.save();
}

function handleMarineStolen(event: MarineStolen): void {
  const callerAddress = event.transaction.from.toHexString();
  let caller = Player.load(callerAddress);
  if (caller == null) {
    caller = initPlayer(callerAddress);
  }
  caller.marinesLost = caller.marinesLost.plus(ONE_BI);
  caller.save();

  const game = loadGame();
  game.marinesStolen = game.marinesStolen.plus(ONE_BI);
  game.save();


  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId;
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId.toString());
  const stolenToken = initStolenToken(compositeTokenId, tokenId, callerAddress, event.transaction.hash.toString(), true);
  stolenToken.save();
}

export function handleTransfer(event: Transfer): void {
  const callerAddress = event.transaction.from.toHexString();
  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId.toString();
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId);

  const token = Token.load(compositeTokenId);
  if (token == null) {
    throw new Error(`Token (${compositeTokenId}) should have been created in mint event`)
  }

  const to = event.params.to.toHexString();
  if (token.owner == to) {
    // Token is being unstaked from the StakingPool, noop
    return;
  }

  let newOwner = Player.load(to);
  if (newOwner == null) {
    newOwner = initPlayer(to);
  }

  const from = event.params.from.toHexString();
  const isNewMint = from == ADDRESS_ZERO;
  if (!isNewMint) {
    let prevOwner = Player.load(from);
    if (prevOwner == null) {
      // this should never happen
      prevOwner = initPlayer(from);
      prevOwner.tokensOwned = prevOwner.tokensOwned.plus(ONE_BI);
    }

    decrementTokensOwned(prevOwner, token);
    prevOwner.save();
  } else if (to !== callerAddress) {
    // This token was stolen, update StolenToken.thief now that we know who it is
    const stolenToken = StolenToken.load(compositeTokenId);
    if (stolenToken == null) {
      throw new Error('Token was stolen but not tracked');
    }

    stolenToken.thief = to;
    stolenToken.save();

    // increment aliens / marines stolen
    if (token.name === NAME_MARINE) {
      newOwner.aliensStolen = newOwner.aliensStolen.plus(ONE_BI);
    } else {
      newOwner.marinesStolen = newOwner.marinesStolen.plus(ONE_BI);
    }
  }

  incrementTokensOwned(newOwner, token);
  newOwner.save();

  token.owner = newOwner.id;
  token.save();
}
