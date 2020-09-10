import {
  encodeTransaction,
  getHashFromEncoded,
  RLPEncodedTx,
  rlpEncodedTx
} from '@celo/contractkit/lib/utils/signing-utils'
import { toTxResult, TransactionResult } from '@celo/contractkit/lib/utils/tx-result'
// @ts-ignore-next-line
import { bytes as Bytes, hash as Hash, RLP } from 'eth-lib'

function chainIdTransformationForSigning(chainId: number): number {
  return chainId * 2 + 8
}

async function _rlpEncodedTx (kit: any, web3Tx: any): Promise<RLPEncodedTx> {
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

  return rlpEncodedTx(celoTx)
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

export async function sendTransaction (kit: any, web3: any, web3Tx: any): Promise<TransactionResult> {
  try {
    const celoTx = await _rlpEncodedTx(kit, web3Tx)
    const signature = await web3.eth.sign(getHashFromEncoded(celoTx.rlpEncode), celoTx.transaction.from)

    const v = web3.utils.hexToNumber(`0x${signature.slice(130)}`) + chainIdTransformationForSigning(celoTx.transaction.chainId)
    const r = Buffer.from(signature.slice(2, 66), 'hex')
    const s = Buffer.from(signature.slice(66, 130), 'hex')

    const encodeTx = await encodeTransaction(celoTx, { v, s, r })

    return toTxResult(kit.web3.eth.sendSignedTransaction(encodeTx.raw))
  } catch (error) {
    throw new Error(error)
  }
}
