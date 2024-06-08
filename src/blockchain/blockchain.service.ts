import { Injectable } from '@nestjs/common';

import Web3, { Contract } from 'web3';

import IPManager from '../../build/IPManager.json';
import { Point, sign } from '@noble/secp256k1';
import path from 'path';
import * as snarkjs from 'snarkjs';

// bigendian
function bigint_to_Uint8Array(x) {
  var ret = new Uint8Array(32);
  for (var idx = 31; idx >= 0; idx--) {
      ret[idx] = Number(x % 256n);
      x = x / 256n;
  }
  return ret;
}

// bigendian
function Uint8Array_to_bigint(x) {
  var ret = 0n;
  for (var idx = 0; idx < x.length; idx++) {
      ret = ret * 256n;
      ret = ret + BigInt(x[idx]);
  }
  return ret;
}

function bigint_to_array(n, k, x) {

  let mod = 1n;
  for (var idx = 0; idx < n; idx++) {
      mod = mod * 2n;
  }

  let ret = [];
  var x_temp = x;
  for (var idx = 0; idx < k; idx++) {
      ret.push((x_temp % mod));
      x_temp = x_temp / mod;
  }

  return ret;
}

function array_to_stringarray(arr) {
  let ret = [];
  for (var idx = 0; idx < arr.length; idx++) {
      ret.push(arr[idx].toString());
  }
  return ret;
}

@Injectable()
export class BlockchainService {

  contractABI = IPManager.abi;
  ipManagerContractAddress = '0x026F3564D579A1120c11852e7D4D3766F3424780'; // Default contract address

  public web3: Web3;
  public ipManagerContract: Contract<any>;

  constructor() {
    this.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
    this.ipManagerContract = new this.web3.eth.Contract(IPManager.abi, this.ipManagerContractAddress); // Contract instance
  }

  async createAccount() {

    // Create an Ethereum account (on the testnet) with balance 1000
    const account = await this.web3.eth.accounts.create();

    // ? Send 10 ETH to the account for testing purposes
    await this.web3.eth.sendTransaction({
      from: '0x0d054903716c9D179568643d39d4475075f08394', // ! Replace with the address of the account created by ganache with enough balance (for testing purposes)
      to: account.address,
      value: this.web3.utils.toWei('10', 'ether')
    });

    return account;
  }

  async getBalance(address: string) {
    return this.web3.eth.getBalance(address);
  }

  async generateProof(privateKeyHash: string, ipHash: string) {

    // Private key of the IP owner
    const privkey = BigInt(privateKeyHash);

    // Calculate the public key
    const pubkey = Point.fromPrivateKey(privkey);

    const pub0 = pubkey.x;
    const pub1 = pubkey.y;

    // Message to be signed (hash of the hash of the IP)
    const msg = BigInt('0x' + ipHash);

    // Sign the message (ECDSA signature)
    const sig = await sign(bigint_to_Uint8Array(msg), bigint_to_Uint8Array(privkey), {canonical: true, der: false});

    // Extract r value and convert to array
    const r_array = bigint_to_array(64, 4, Uint8Array_to_bigint(sig.slice(0, 32)));
    const s_array = bigint_to_array(64, 4, Uint8Array_to_bigint(sig.slice(32, 64)));
    const msg_array = bigint_to_array(64, 4, msg);
    const pub0_array = bigint_to_array(64, 4, pub0);
    const pub1_array = bigint_to_array(64, 4, pub1);

    // ! TO GENERATE THIS, USE THE ZKP ENV SETUP SCRIPT (./circuit/main.sh)
    const wasmPath = path.join(process.cwd(), `./circuit/build/ip_ecdsa_verify_js/ip_ecdsa_verify.wasm`);
    const provingKeyPath = path.join(process.cwd(), `./circuit/build/ip_ecdsa_verify.zkey`)

    // Generate a proof of the circuit and create a structure for the output signals
    return snarkjs.groth16.fullProve(
      {
        "r": array_to_stringarray(r_array),
        "s": array_to_stringarray(s_array),
        "msghash": array_to_stringarray(msg_array),
        "pubkey": [array_to_stringarray(pub0_array), array_to_stringarray(pub1_array)]
      },
      wasmPath,
      provingKeyPath
    );

  }

  // Send a transaction to the IPManager contract
  async sendIPTransaction(a: any, b: any, c: any, Input: any, from: string, privateKey: string) {

    // Encode the function ABI (to be sent in the transaction data field)
    const functionAbi = this.ipManagerContract.methods.registerIP(
      a,
      b,
      c,
      Input,
    ).encodeABI();

    // Transaction object
    const tx = {
      from,
      to: this.ipManagerContractAddress,
      gas: 5000000,
      gasPrice: '1000000',
      data: functionAbi
    };

    // Sign the transaction with the private key of the IP owner
    const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);

    // Send the signed transaction
    return this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)

  }

}
