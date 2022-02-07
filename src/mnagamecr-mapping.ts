import {
  MintCommitted,
  MintRevealed,
} from '../generated/MnAGameCR/MnAGameCR'
import { Game } from '../generated/schema'
import { loadGame } from './util/helpers';

export function handleMintCommitted(event: MintCommitted): void {
  const game = loadGame();
  game.mintsCommitted = game.mintsCommitted.plus(event.params.amount);
  game.save();
}

export function handleMintRevealed(event: MintRevealed): void {
  const game = loadGame();
  game.mintsRevealed = game.mintsRevealed .plus(event.params.amount);
  game.save();
}
