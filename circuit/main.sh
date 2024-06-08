#!/bin/bash

# Phase 1 ptau file for the circuit (not included in the repository) [https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_21.ptau]
PHASE1=./powersOfTau28_hez_final_21.ptau

BUILD_DIR=./build
CIRCUIT_NAME=ip_ecdsa_verify

if [ -f "$PHASE1" ]; then
    echo "Found Phase 1 ptau file"
else
    echo "No Phase 1 ptau file found. Please download the file from https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_21.ptau. Exiting..."
    exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
    echo "No build directory found. Creating build directory..."
    mkdir -p "$BUILD_DIR"
fi

########################################
# Circuit Compilation and Verification #
########################################

# Execute the following commands once per circuit (unless the circuit is modified)

# Compile the circuit
echo "****COMPILING CIRCUIT****"
start=`date +%s`
set -x
circom "$CIRCUIT_NAME".circom --r1cs --wasm --sym --c --wat --output "$BUILD_DIR"
{ set +x; } 2>/dev/null
end=`date +%s`
echo "DONE ($((end-start))s)"

# Generate the trusted setup (Phase one is already done and the ptau file is provided)
echo "****GENERATING ZKEY 0****"
start=`date +%s`
npx snarkjs groth16 setup "$BUILD_DIR"/"$CIRCUIT_NAME".r1cs "$PHASE1" "$BUILD_DIR"/"$CIRCUIT_NAME"_0.zkey
end=`date +%s`
echo "DONE ($((end-start))s)"

# Contribute to the ceremony (phase 2)
echo "****CONTRIBUTE TO THE PHASE 2 CEREMONY****"
start=`date +%s`
npx snarkjs zkey contribute "$BUILD_DIR"/"$CIRCUIT_NAME"_0.zkey "$BUILD_DIR"/"$CIRCUIT_NAME"_1.zkey --name="1st Contributor Name" --entropy="Test"
end=`date +%s`
echo "DONE ($((end-start))s)"

# Generate the final zkey
echo "****GENERATING FINAL ZKEY****"
start=`date +%s`
npx snarkjs zkey beacon "$BUILD_DIR"/"$CIRCUIT_NAME"_1.zkey "$BUILD_DIR"/"$CIRCUIT_NAME".zkey 0102030405060708090a0b0c0d0e0f101112231415161718221a1b1c1d1e1f 10 -n="Final Beacon phase2"
end=`date +%s`
echo "DONE ($((end-start))s)"

# Verify the final zkey
echo "****VERIFYING FINAL ZKEY****"
start=`date +%s`
npx snarkjs zkey verify "$BUILD_DIR"/"$CIRCUIT_NAME".r1cs "$PHASE1" "$BUILD_DIR"/"$CIRCUIT_NAME".zkey
end=`date +%s`
echo "DONE ($((end-start))s)"

# Export the verification key
echo "** Exporting vkey"
start=`date +%s`
npx snarkjs zkey export verificationkey "$BUILD_DIR"/"$CIRCUIT_NAME".zkey "$BUILD_DIR"/vkey.json
end=`date +%s`
echo "DONE ($((end-start))s)"

# ########################################
# # Circuit Witness and Proof Generation #
# ########################################

# Execute the following commands for each input (in this case, a sample input)

# Generate a sample input
echo "****GENERATING SAMPLE INPUT****"
start=`date +%s`
npm i && node generateSampleInput.js
end=`date +%s`
echo "DONE ($((end-start))s)"

Generate the witness
echo "****GENERATING WITNESS FOR SAMPLE INPUT****"
start=`date +%s`
node "$BUILD_DIR"/"$CIRCUIT_NAME"_js/generate_witness.js "$BUILD_DIR"/"$CIRCUIT_NAME"_js/"$CIRCUIT_NAME".wasm input.json "$BUILD_DIR"/witness.wtns
end=`date +%s`
echo "DONE ($((end-start))s)"

# Generate the public input
echo "****GENERATING PROOF FOR SAMPLE INPUT****"
start=`date +%s`
npx snarkjs groth16 prove "$BUILD_DIR"/"$CIRCUIT_NAME".zkey "$BUILD_DIR"/witness.wtns "$BUILD_DIR"/proof.json "$BUILD_DIR"/public.json
end=`date +%s`
echo "DONE ($((end-start))s)"

Verify the proof
echo "****VERIFYING PROOF FOR SAMPLE INPUT****"
start=`date +%s`
npx snarkjs groth16 verify "$BUILD_DIR"/vkey.json "$BUILD_DIR"/public.json "$BUILD_DIR"/proof.json
end=`date +%s`
echo "DONE ($((end-start))s)"

# Export the Solidity verifier
echo "****GENERATING SOLIDITY VERIFIER****"
start=`date +%s`
snarkjs zkey export solidityverifier "$BUILD_DIR"/"$CIRCUIT_NAME".zkey Groth16Verifier.sol
mkdir -p ./contracts && mv ./Groth16Verifier.sol ./contracts # Moving the verifier into the contracts folder (create the folder if it doesn't exist)
end=`date +%s`
echo "DONE ($((end-start))s)"

