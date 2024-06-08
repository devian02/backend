const fs = require("fs");
const { sign, Point } = require("@noble/secp256k1");
const { keccak256 } = require('ethereumjs-util');

const snarkjs = require('snarkjs');
const path = require('path');

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


async function main() {

  // Private key of the IP owner
  const privkey = BigInt('0xc3c67b0de743f5274d24554fda2894e3a17461a2a3d096c1e547e8b993d99ee6');

  // Calculate the public key
  const pubkey = Point.fromPrivateKey(privkey);

  const pub0 = pubkey.x;
  const pub1 = pubkey.y;

  // Message to be signed (hash of the hash of the IP)
  const msg = 110977009687373213104962226057480551605828725303063265716157300460694423838923n;

  const sig = await sign(bigint_to_Uint8Array(msg), bigint_to_Uint8Array(privkey), {canonical: true, der: false});

  // Extract r value and convert to array
  const r_array = bigint_to_array(64, 4, Uint8Array_to_bigint(sig.slice(0, 32)));
  const s_array = bigint_to_array(64, 4, Uint8Array_to_bigint(sig.slice(32, 64)));
  const msg_array = bigint_to_array(64, 4, msg);
  const pub0_array = bigint_to_array(64, 4, pub0);
  const pub1_array = bigint_to_array(64, 4, pub1);

  fs.writeFileSync('input.json', JSON.stringify({"r": r_array.map((x) => x.toString(10)),
  "s": s_array.map((x) => x.toString(10)),
  "msghash": msg_array.map((x) => x.toString(10)),
  "pubkey": [pub0_array.map((x) => x.toString(10)), pub1_array.map((x) => x.toString(10))]}, null, 1));



  // ---------------------------------------------
  // Script to generate the proof with snarkjs and output the inputs for the solidity verifier
  // ---------------------------------------------

  const wasmPath = path.join(process.cwd(), `./build/ip_ecdsa_verify_js/ip_ecdsa_verify.wasm`);
  const provingKeyPath = path.join(process.cwd(), `./build/ip_ecdsa_verify.zkey`)

  // Generate a proof of the circuit and create a structure for the output signals
  const { proof, publicSignals } = await snarkjs.groth16.fullProve({"r": r_array,
  "s": s_array,
  "msghash": msg_array,
  "pubkey": [pub0_array, pub1_array]}, wasmPath, provingKeyPath);

  // Convert the data into Solidity calldata that can be sent as a transaction
  const calldataBlob = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

  const argv = calldataBlob.replace(/["[\]\s]/g, "").split(",").map((x) => BigInt(x).toString());

  const a = [argv[0], argv[1]];
  const b = [
    [argv[2], argv[3]],
    [argv[4], argv[5]],
  ];
  const c = [argv[6], argv[7]];
  const Input = [];

  for (let i = 8; i < argv.length; i++) {
    Input.push(argv[i]);
  }

  fs.writeFileSync(
    'input_solidity.json',
    JSON.stringify({"_pA": a,"_pB": b,"_pC": c,"_pubSignals": Input}, null, 1)
  );

}

main();
