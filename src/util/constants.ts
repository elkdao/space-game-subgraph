import { BigInt, BigDecimal } from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const ZERO_BD = BigDecimal.fromString('0')
export const ONE_BD = BigDecimal.fromString('1')

// Game constants
export const GAME_ID = 'SpaceGame'
export const RARITIES_ID = '0'

export const NAME_ALIEN = 'Alien'
export const NAME_PASS = 'FounderPass'
export const NAME_MARINE = 'Marine'
export const CONTRACT_PASS = '0xf4a57dac3d3a4772347f813c6bf52b6286ac649e'
export const CONTRACT_MNA = '0xdbe147fc80b49871e2a8D60cc89D51b11bc88b35'
export const CONTRACT_SPIDOX = '0x853bf5ad76d3ae766b7c3677fd0819c3a1af3443'

// JSON
export const TRAIT_TYPE = 'trait_type'
export const TRAIT_VALUE = 'value'
export const PROP_IMAGE = 'image'
export const PROP_ATTRIBUTES = 'attributes'
