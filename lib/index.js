"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTransaction = exports.estimateGas = void 0;
var address_1 = require("@celo/base/lib/address");
// @ts-ignore-next-line
var eth_lib_1 = require("eth-lib");
var helpers = require("web3-core-helpers");
function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
function chainIdTransformationForSigning(chainId) {
    return chainId * 2 + 8;
}
function getHashFromEncoded(rlpEncode) {
    return eth_lib_1.hash.keccak256(rlpEncode);
}
function trimLeadingZero(hex) {
    while (hex && hex.startsWith('0x0')) {
        hex = address_1.ensureLeading0x(hex.slice(3));
    }
    return hex;
}
function makeEven(hex) {
    if (hex.length % 2 === 1) {
        hex = hex.replace('0x', '0x0');
    }
    return hex;
}
function stringNumberToHex(num) {
    var auxNumber = Number(num);
    if (num === '0x' || num === undefined || auxNumber === 0) {
        return '0x';
    }
    return eth_lib_1.bytes.fromNumber(auxNumber);
}
function _rlpEncodedTx(tx) {
    var _a, _b;
    if (!tx.gas) {
        throw new Error('"gas" is missing');
    }
    if (isNullOrUndefined(tx.chainId) ||
        isNullOrUndefined(tx.gasPrice) ||
        isNullOrUndefined(tx.nonce)) {
        throw new Error('One of the values "chainId", "gasPrice", or "nonce" couldn\'t be fetched: ' +
            JSON.stringify({ chainId: tx.chainId, gasPrice: tx.gasPrice, nonce: tx.nonce }));
    }
    if (tx.nonce < 0 || tx.gas < 0 || tx.gasPrice < 0 || tx.chainId < 0) {
        throw new Error('Gas, gasPrice, nonce or chainId is lower than 0');
    }
    var transaction = helpers.formatters.inputCallFormatter(tx);
    transaction.to = eth_lib_1.bytes.fromNat(tx.to || '0x').toLowerCase();
    transaction.nonce = Number((tx.nonce !== '0x' ? tx.nonce : 0) || 0);
    transaction.data = eth_lib_1.bytes.fromNat(tx.data || '0x').toLowerCase();
    transaction.value = stringNumberToHex((_a = tx.value) === null || _a === void 0 ? void 0 : _a.toString());
    transaction.feeCurrency = eth_lib_1.bytes.fromNat(tx.feeCurrency || '0x').toLowerCase();
    transaction.gatewayFeeRecipient = eth_lib_1.bytes.fromNat(tx.gatewayFeeRecipient || '0x').toLowerCase();
    transaction.gatewayFee = stringNumberToHex(tx.gatewayFee);
    transaction.gasPrice = stringNumberToHex((_b = tx.gasPrice) === null || _b === void 0 ? void 0 : _b.toString());
    transaction.gas = stringNumberToHex(tx.gas);
    transaction.chainId = tx.chainId || 1;
    // This order should match the order in Geth.
    // https://github.com/celo-org/celo-blockchain/blob/027dba2e4584936cc5a8e8993e4e27d28d5247b8/core/types/transaction.go#L65
    var rlpEncode = eth_lib_1.RLP.encode([
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
    ]);
    return { transaction: transaction, rlpEncode: rlpEncode };
}
function encodeTransaction(rlpEncoded, signature) {
    var v = stringNumberToHex(signature.v);
    var r = makeEven(trimLeadingZero(address_1.ensureLeading0x(signature.r)));
    var s = makeEven(trimLeadingZero(address_1.ensureLeading0x(signature.s)));
    var rawTx = eth_lib_1.RLP.decode(rlpEncoded.rlpEncode)
        .slice(0, 9)
        .concat([v, r, s]);
    var rawTransaction = eth_lib_1.RLP.encode(rawTx);
    var hash = getHashFromEncoded(rawTransaction);
    var result = {
        tx: {
            nonce: rlpEncoded.transaction.nonce.toString(),
            gasPrice: rlpEncoded.transaction.gasPrice.toString(),
            gas: rlpEncoded.transaction.gas.toString(),
            to: rlpEncoded.transaction.to.toString(),
            value: rlpEncoded.transaction.value.toString(),
            input: rlpEncoded.transaction.data,
            v: v,
            r: r,
            s: s,
            hash: hash,
        },
        raw: rawTransaction,
    };
    return result;
}
function rlpEncodedTx(kit, web3Tx) {
    return __awaiter(this, void 0, void 0, function () {
        var celoTx, gas, e_1, gasPrice, chainId, nonce;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    celoTx = kit.fillTxDefaults(JSON.parse(JSON.stringify(web3Tx)));
                    return [4 /*yield*/, kit.fillGasPrice(celoTx)];
                case 1:
                    celoTx = _a.sent();
                    if (!(celoTx.gas == null)) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, kit.web3.eth.estimateGas(celoTx)];
                case 3:
                    gas = _a.sent();
                    celoTx.gas = Math.round(gas * kit.config.gasInflationFactor);
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    throw new Error(e_1);
                case 5:
                    if (!(celoTx.gasPrice === '0x0')) return [3 /*break*/, 7];
                    return [4 /*yield*/, kit.web3.eth.getGasPrice()];
                case 6:
                    gasPrice = _a.sent();
                    celoTx.gasPrice = gasPrice;
                    _a.label = 7;
                case 7: return [4 /*yield*/, kit.web3.eth.getChainId()];
                case 8:
                    chainId = _a.sent();
                    celoTx.chainId = chainId;
                    return [4 /*yield*/, kit.web3.eth.getTransactionCount(celoTx.from)];
                case 9:
                    nonce = _a.sent();
                    celoTx.nonce = nonce;
                    return [2 /*return*/, _rlpEncodedTx(celoTx)];
            }
        });
    });
}
function estimateGas(kit, web3Tx) {
    return __awaiter(this, void 0, void 0, function () {
        var celoTx, gas, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    celoTx = kit.fillTxDefaults(JSON.parse(JSON.stringify(web3Tx)));
                    return [4 /*yield*/, kit.fillGasPrice(celoTx)];
                case 1:
                    celoTx = _a.sent();
                    if (!(celoTx.gas == null)) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, kit.web3.eth.estimateGas(celoTx)];
                case 3:
                    gas = _a.sent();
                    celoTx.gas = Math.round(gas * kit.config.gasInflationFactor);
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _a.sent();
                    throw new Error(e_2);
                case 5: return [2 /*return*/, celoTx.gas];
            }
        });
    });
}
exports.estimateGas = estimateGas;
function sendTransaction(kit, web3, web3Tx) {
    return __awaiter(this, void 0, void 0, function () {
        var celoTx, signature, v, r, s, encodeTx, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, rlpEncodedTx(kit, web3Tx)];
                case 1:
                    celoTx = _a.sent();
                    return [4 /*yield*/, web3.eth.sign(getHashFromEncoded(celoTx.rlpEncode), celoTx.transaction.from)];
                case 2:
                    signature = _a.sent();
                    v = web3.utils.hexToNumber("0x" + signature.slice(130)) + chainIdTransformationForSigning(celoTx.transaction.chainId);
                    r = signature.slice(0, 66);
                    s = "0x" + signature.slice(66, 130);
                    encodeTx = encodeTransaction(celoTx, { v: v, s: s, r: r });
                    return [2 /*return*/, kit.web3.eth.sendSignedTransaction(encodeTx.raw)];
                case 3:
                    error_1 = _a.sent();
                    console.error(error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.sendTransaction = sendTransaction;
