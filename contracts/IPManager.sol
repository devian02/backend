// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Groth16Verifier.sol";

contract IPManager {

    // Structure to hold intellectual property details
    struct IntellectualProperty {
        address owner;
        string ipHash;
        uint256 timestamp;
        bool proved;
    }

    IntellectualProperty[] public intellectualProperties;

    // Event to be emitted when a new IP is registered
    event IPRegistered(string ipHash, address owner, uint256 timestamp);

    function arrayToBigInt(uint256 n, uint256 k, uint256[] memory x) internal pure returns (uint256) {
        // Convert an array of bigints to the original bigint

        uint256 mod = 1;
        for (uint256 idx = 0; idx < n; idx++) {
            mod = mod * 2;
        }

        uint256 ret = 0;
        for (uint256 idx = k; idx > 0; idx--) {
            ret = ret * mod;
            ret = ret + x[idx - 1];
        }

        return ret;
    }

    function getAddressFromPubKey(uint256 x, uint256 y) internal pure returns (address) {
        // Get an address from a public key (x, y) using keccak256

        // Convert x and y to bytes
        bytes memory xBytes = uint256ToBytes(x);
        bytes memory yBytes = uint256ToBytes(y);

        // Concatenate x and y bytes
        bytes memory concatenated = abi.encodePacked(xBytes, yBytes);

        // Hash the concatenated data using keccak256
        bytes32 hashed = keccak256(concatenated);

        // Convert the hashed data to an address
        return address(uint160(uint256(hashed)));
    }

    function uint256ToBytes(uint256 x) internal pure returns (bytes memory) {
        // Convert a uint256 to bytes

        bytes memory b = new bytes(32);
        assembly { mstore(add(b, 32), x) }
        return b;
    }

    function uint256ToHex(uint256 value) public pure returns (string memory) {
        // Convert a uint256 to a hex string

        bytes32 valueBytes = bytes32(value);
        bytes memory hexString = new bytes(64);

        bytes memory alphabet = "0123456789abcdef";

        for (uint256 i = 0; i < 32; i++) {
            hexString[i*2] = alphabet[uint8(valueBytes[i] >> 4)];
            hexString[1 + i*2] = alphabet[uint8(valueBytes[i] & 0x0f)];
        }

        return string(hexString);
    }

    function registerIP(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[13] memory _pubSignals) public {
        // Register an IP
        // The function takes the proof and public signals as input
        // The proof is verified using the Groth16Verifier contract
        // The public signals are extracted from the proof and used to register the IP

        Groth16Verifier verifier = new Groth16Verifier();

        // Verify the proof (true if valid, false if invalid)
        bool proof = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);

        require(proof, "Invalid proof");

        // Extract ipHash from pubSignals [1:5]
        uint256[] memory ipHash_array = new uint256[](4);

        for (uint256 idx = 0; idx < 4; idx++) {
            ipHash_array[idx] = _pubSignals[idx + 1];
        }

        // Convert ipHash_array to a bigint
        uint256 ipHashBigInt = arrayToBigInt(64, 4, ipHash_array);

        // Extract pubkey.x from pubSignals [5:9]
        uint256[] memory pubkey_x_array = new uint256[](4);

        for (uint256 idx = 0; idx < 4; idx++) {
            pubkey_x_array[idx] = _pubSignals[idx + 5];
        }

        // Convert pubkey_x_array to a bigint
        uint256 pubkey_x = arrayToBigInt(64, 4, pubkey_x_array);

        // Extract pubkey.y from pubSignals [9:13]
        uint256[] memory pubkey_y_array = new uint256[](4);

        for (uint256 idx = 0; idx < 4; idx++) {
            pubkey_y_array[idx] = _pubSignals[idx + 9];
        }

        // Convert pubkey_y_array to a bigint
        uint256 pubkey_y = arrayToBigInt(64, 4, pubkey_y_array);

        // Get the address from pubkey.x and pubkey.y
        address owner = getAddressFromPubKey(pubkey_x, pubkey_y);

        // Check if msg.sender is the owner
        require(msg.sender == owner, "The signature must be signed by the owner");

        // Register the IP
        IntellectualProperty memory newIP = IntellectualProperty({
            owner: owner,
            ipHash: uint256ToHex(ipHashBigInt),
            timestamp: block.timestamp,
            proved: proof
        });

        intellectualProperties.push(newIP);

    }

}