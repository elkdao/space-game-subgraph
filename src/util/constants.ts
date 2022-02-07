import { BigInt, BigDecimal } from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const ZERO_BD = BigDecimal.fromString('0')
export const ONE_BD = BigDecimal.fromString('1')

// Game constants
export const GAME_ID = 'MnA';
export const NAME_ALIEN = 'Alien';
export const NAME_MARINE = 'Marine';

// TODO: replace with real contract address;
export const MNA_CONTRACT = ADDRESS_ZERO;
