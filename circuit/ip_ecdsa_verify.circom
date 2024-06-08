pragma circom 2.1.6;

include "./circom-ecdsa/circuits/ecdsa.circom";

component main {public [msghash, pubkey]} = ECDSAVerifyNoPubkeyCheck(64, 4);