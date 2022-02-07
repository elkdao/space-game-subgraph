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

function loadGame(): Game {
  let game = Game.load(GAME_ID);
  if (game == null) {
    game = new Game(GAME_ID);
    game.aliensMinted = ZERO_BI;
    game.aliensStaked = ZERO_BI;
    game.aliensStolen = ZERO_BI;
    game.marinesMinted = ZERO_BI;
    game.marinesStaked = ZERO_BI;
    game.marinesStolen = ZERO_BI;
  }

  return game;
}

function tokenIdErc721(contract: string, tokenId: string): string {
  return `${contract}-${tokenId}`;
}

function initPlayer(id: string): Player {
  const player = new Player(id);
  player.aliensLost = ZERO_BI;
  player.aliensOwned = ZERO_BI;
  player.aliensStolen = ZERO_BI;
  player.mints = ZERO_BI;
  player.tokensOwned = ZERO_BI;
  player.marinesLost = ZERO_BI;
  player.marinesOwned = ZERO_BI;
  player.marinesStolen = ZERO_BI;

  return player;
}

function initToken(id: string, tokenId: BigInt, name: string, owner: string, tx: string): Token {
  const token = new Token(id);
  token.name = name;
  token.tokenId = tokenId;
  token.balance = ONE_BI;
  token.owner = owner;
  token.isStaked = false;
  token.mintTx = tx;

  return token;
};

function initStolenToken(id: string, tokenId: BigInt, name: string, thief: string, victim: string, tx: string): StolenToken {
  const token = new StolenToken(id);
  token.tokenId = tokenId;
  token.name = name;
  token.thief = thief;
  token.victim = victim;
  token.mintTx = tx;

  return token;
}

function isTokenStaked(newOwner: string): boolean {
  return STAKING_POOL_CONTRACTS.has(newOwner.toLowerCase());
}

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

function handleTokenStake(event: Transfer, token: Token): void {
  token.isStaked = true;
  token.save();

  const game = loadGame();
  if (token.name == NAME_MARINE) {
    game.marinesStaked = game.marinesStaked.plus(ONE_BI);
  } else {
    game.aliensStaked = game.aliensStaked.plus(ONE_BI);
  }

  game.save();
}

function handleTokenUnstake(event: Transfer, token: Token): void {
  token.isStaked = false;
  token.save();

  const game = loadGame();
  if (token.name == NAME_MARINE) {
    game.marinesStaked = game.marinesStaked.minus(ONE_BI);
  } else {
    game.aliensStaked = game.aliensStaked.minus(ONE_BI);
  }

  game.save();
}

function handleMintStake(event: Transfer, token: Token): void {
  const callerAddress = event.transaction.from.toHexString();
  let caller = Player.load(callerAddress);
  if (caller == null) {
    caller = initPlayer(callerAddress);
  }

  incrementTokensOwned(caller, token);
  caller.save();

  token.owner = caller.id;
  token.isStaked = true;
  token.save();

  const game = loadGame();
  if (token.name == NAME_MARINE) {
    game.marinesStaked = game.marinesStaked.plus(ONE_BI);
  } else {
    game.aliensStaked = game.aliensStaked.plus(ONE_BI);
  }

  game.save();
}

function handleMintStolen(event: Transfer, token: Token): void {
  const callerAddress = event.transaction.from.toHexString();
  let caller = Player.load(callerAddress);
  if (caller == null) {
    caller = initPlayer(callerAddress);
  }

  const to = event.params.to.toHexString();
  let thief = Player.load(to);
  if (thief == null) {
    thief = initPlayer(to);
  }

  const game = loadGame();
  if (token.name == NAME_MARINE) {
    caller.marinesLost = caller.marinesLost.plus(ONE_BI);
    thief.marinesStolen = thief.marinesStolen.plus(ONE_BI);
    game.marinesStolen = game.marinesStolen.plus(ONE_BI);
  } else {
    caller.aliensLost = caller.aliensLost.plus(ONE_BI);
    thief.aliensStolen = thief.aliensStolen.plus(ONE_BI);
    game.aliensStolen = game.aliensStolen.plus(ONE_BI);
  }

  game.save();
  caller.save();

  incrementTokensOwned(thief, token);
  thief.save();

  token.owner = thief.id;
  token.save();

  const tx = event.transaction.hash.toHexString();
  const stolenToken = initStolenToken(token.id, token.tokenId, token.name, thief.id, caller.id, tx);
  stolenToken.save();
}

function handleMint(event: Transfer, token: Token): void {
  const to = event.params.to.toHexString();
  let minter = Player.load(to);
  if (minter == null) {
    minter = initPlayer(to);
  }

  incrementTokensOwned(minter, token);
  minter.save();

  token.owner = minter.id;
  token.save();
}

function handlePlayerTransfer(event: Transfer, token: Token): void {
  const from = event.params.from.toHexString();
  let prevOwner = Player.load(from);
  if (prevOwner == null) {
    // this should never happen
    prevOwner = initPlayer(from);
    prevOwner.tokensOwned = prevOwner.tokensOwned.plus(ONE_BI);
  }

  const to = event.params.to.toHexString();
  let newOwner = Player.load(to);
  if (newOwner == null) {
    newOwner = initPlayer(to);
  }

  decrementTokensOwned(prevOwner, token);
  prevOwner.save();

  incrementTokensOwned(newOwner, token);
  newOwner.save();

  token.owner = newOwner.id;
  token.save();
}

// Transfer is emitted anytime a token is sent to a different address
// We need to handle the following cases:
// 1. Stake
// 2. Unstake
// 3. Mint & Stake
// 4. Mint & Stolen
// 5. Mint to Caller
// 6. Player to Player Transfer
export function handleTransfer(event: Transfer): void {
  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId.toString();
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId);

  const token = Token.load(compositeTokenId);
  if (token == null) {
    throw new Error(`Token (${compositeTokenId}) should have been created in mint event`)
  }

  const callerAddress = event.transaction.from.toHexString();
  const to = event.params.to.toHexString();
  const from = event.params.from.toHexString();
  const isNewMint = from == ADDRESS_ZERO;
  const isBeingStaked = isTokenStaked(to);

  if (isBeingStaked && !isNewMint) {
    // 1. Stake
    handleTokenStake(event, token);
  } else if (isTokenStaked(from)) {
    // 2. Unstake
    handleTokenUnstake(event, token);
  } else if (isNewMint && isBeingStaked) {
    // 3. Mint & Stake
    handleMintStake(event, token);
  } else if (isNewMint && to != callerAddress) {
    // 4. Mint & Stolen
    handleMintStolen(event, token);
  } else if (isNewMint) {
    // 5. Mint to Caller
    handleMint(event, token);
  } else if (!isNewMint) {
    // 6. Player to Player Transfer
    handlePlayerTransfer(event, token);
  } else {
    throw new Error('Unhandled case');
  }
}

function handleTokenBurned(tokenId: string): void {
  const token = Token.load(tokenId);
  if (token == null) {
    log.warning('Received Burn event for token ({}) but entity does not exist', [tokenId]);
    return;
  }

  const owner = Player.load(token.owner);
  if (owner == null) {
    log.warning('Received Burn event for token ({}) but could not load owner ({})', [tokenId, token.owner]);
    return;
  }

  decrementTokensOwned(owner, token);
  owner.save();

  token.owner = ADDRESS_ZERO;
  token.save();
}

export function handleAlienBurned(event: AlienBurned): void {
  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId.toString();
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId);
  handleTokenBurned(compositeTokenId);
}

export function handleMarineBurned(event: MarineBurned): void {
  const contractAddress = event.address.toHexString();
  const tokenId = event.params.tokenId.toString();
  const compositeTokenId = tokenIdErc721(contractAddress, tokenId);
  handleTokenBurned(compositeTokenId);
}
