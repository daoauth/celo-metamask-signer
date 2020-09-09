import { ensureLeading0x } from '@celo/base/lib/address'
// @ts-ignore-next-line
import { bytes as Bytes, hash as Hash, RLP } from 'eth-lib'
import * as helpers from 'web3-core-helpers'

interface CeloTx {
  chainId: number,
  nonce: number,
  gasPrice: string | number,
  gas: string | number,
  from: string,
  to: string,
  value: string,
  data: string,
  feeCurrency: string,
  gatewayFeeRecipient: string,
  gatewayFee: string
}

interface EncodedTransaction {
  raw: string
  tx: {
    nonce: string
    gasPrice: string
    gas: string
    to: string
    value: string
    input: string
    v: string
    r: string
    s: string
    hash: string
  }
}

interface RLPEncodedTx {
  transaction: CeloTx
  rlpEncode: any
}

function isNullOrUndefined(value: any): boolean {
  return value === null || value === undefined
}

function chainIdTransformationForSigning(chainId: number): number {
  return chainId * 2 + 8
}

function getHashFromEncoded(rlpEncode: string): string {
  return Hash.keccak256(rlpEncode)
}

function trimLeadingZero(hex: string) {
  while (hex && hex.startsWith('0x0')) {
    hex = ensureLeading0x(hex.slice(3))
  }
  return hex
}

function makeEven(hex: string) {
  if (hex.length % 2 === 1) {
    hex = hex.replace('0x', '0x0')
  }
  return hex
}

function stringNumberToHex(num?: number | string): string {
  const auxNumber = Number(num)
  if (num === '0x' || num === undefined || auxNumber === 0) {
    return '0x'
  }
  return Bytes.fromNumber(auxNumber)
}

function _rlpEncodedTx(tx: CeloTx): RLPEncodedTx {
  if (!tx.gas) {
    throw new Error('"gas" is missing')
  }

  if (
    isNullOrUndefined(tx.chainId) ||
    isNullOrUndefined(tx.gasPrice) ||
    isNullOrUndefined(tx.nonce)
  ) {
    throw new Error(
      'One of the values "chainId", "gasPrice", or "nonce" couldn\'t be fetched: ' +
        JSON.stringify({ chainId: tx.chainId, gasPrice: tx.gasPrice, nonce: tx.nonce })
    )
  }

  if (tx.nonce! < 0 || tx.gas! < 0 || tx.gasPrice! < 0 || tx.chainId! < 0) {
    throw new Error('Gas, gasPrice, nonce or chainId is lower than 0')
  }
  const transaction: CeloTx = helpers.formatters.inputCallFormatter(tx)
  transaction.to = Bytes.fromNat(tx.to || '0x').toLowerCase()
  transaction.nonce = Number(((tx.nonce as any) !== '0x' ? tx.nonce : 0) || 0)
  transaction.data = Bytes.fromNat(tx.data || '0x').toLowerCase()
  transaction.value = stringNumberToHex(tx.value?.toString())
  transaction.feeCurrency = Bytes.fromNat(tx.feeCurrency || '0x').toLowerCase()
  transaction.gatewayFeeRecipient = Bytes.fromNat(tx.gatewayFeeRecipient || '0x').toLowerCase()
  transaction.gatewayFee = stringNumberToHex(tx.gatewayFee)
  transaction.gasPrice = stringNumberToHex(tx.gasPrice?.toString())
  transaction.gas = stringNumberToHex(tx.gas)
  transaction.chainId = tx.chainId || 1

  // This order should match the order in Geth.
  // https://github.com/celo-org/celo-blockchain/blob/027dba2e4584936cc5a8e8993e4e27d28d5247b8/core/types/transaction.go#L65
  const rlpEncode = RLP.encode([
    stringNumberToHex(transaction.nonce),
    transaction.gasPrice,
    transaction.gas,
    transaction.feeCurrency,
    transaction.gatewayFeeRecipient,
    transaction.gatewayFee,
    transaction.to,
    transaction.value,
    transaction.data,
    stringNumberToHex(transaction.chainId),
    '0x',
    '0x',
  ])

  return { transaction, rlpEncode }
}

function encodeTransaction(
  rlpEncoded: RLPEncodedTx,
  signature: { v: number; r: string; s: string }
): EncodedTransaction {
  const v = stringNumberToHex(signature.v)
  const r = makeEven(trimLeadingZero(ensureLeading0x(signature.r)))
  const s = makeEven(trimLeadingZero(ensureLeading0x(signature.s)))
  const rawTx = RLP.decode(rlpEncoded.rlpEncode)
    .slice(0, 9)
    .concat([v, r, s])

  const rawTransaction = RLP.encode(rawTx)
  const hash = getHashFromEncoded(rawTransaction)

  const result: EncodedTransaction = {
    tx: {
      nonce: rlpEncoded.transaction.nonce!.toString(),
      gasPrice: rlpEncoded.transaction.gasPrice!.toString(),
      gas: rlpEncoded.transaction.gas!.toString(),
      to: rlpEncoded.transaction.to!.toString(),
      value: rlpEncoded.transaction.value!.toString(),
      input: rlpEncoded.transaction.data!,
      v,
      r,
      s,
      hash,
    },
    raw: rawTransaction,
  }
  return result
}

async function rlpEncodedTx (kit: any, web3Tx: any): Promise<RLPEncodedTx> {
  let celoTx = kit.fillTxDefaults(JSON.parse(JSON.stringify(web3Tx)))
  celoTx = await kit.fillGasPrice(celoTx)

  if (celoTx.gas == null) {
    try {
      const gas = await kit.web3.eth.estimateGas(celoTx)
      celoTx.gas = Math.round(gas * kit.config.gasInflationFactor)
    } catch (e) {
      throw new Error(e)
    }
  }

  if (celoTx.gasPrice === '0x0') {
    const gasPrice = await kit.web3.eth.getGasPrice()
    celoTx.gasPrice = gasPrice
  }

  const chainId = await kit.web3.eth.getChainId()
  celoTx.chainId = chainId
  const nonce = await kit.web3.eth.getTransactionCount(celoTx.from)
  celoTx.nonce = nonce

  return _rlpEncodedTx(celoTx)
}

export async function estimateGas (kit: any, web3Tx: any): Promise<number> {
  let celoTx = kit.fillTxDefaults(JSON.parse(JSON.stringify(web3Tx)))
  celoTx = await kit.fillGasPrice(celoTx)

  if (celoTx.gas == null) {
    try {
      const gas = await kit.web3.eth.estimateGas(celoTx)
      celoTx.gas = Math.round(gas * kit.config.gasInflationFactor)
    } catch (e) {
      throw new Error(e)
    }
  }
  return celoTx.gas
}

export async function sendTransaction (kit: any, web3: any, web3Tx: any): Promise<any> {
  try {
    const celoTx = await rlpEncodedTx(kit, web3Tx)
    const signature = await web3.eth.sign(getHashFromEncoded(celoTx.rlpEncode), celoTx.transaction.from)

    const v = web3.utils.hexToNumber(`0x${signature.slice(130)}`) + chainIdTransformationForSigning(celoTx.transaction.chainId)
    const r = signature.slice(0, 66)
    const s = `0x${signature.slice(66, 130)}`

    const encodeTx = encodeTransaction(celoTx, { v, s, r })

    return kit.web3.eth.sendSignedTransaction(encodeTx.raw)
  } catch (error) {
    console.error(error)
    return null
  }
}
