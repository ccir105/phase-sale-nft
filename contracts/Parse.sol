// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

// Helper library for handling and manipulating bytes
import "./Bytes.sol";

library Parse {
    // Split the minting blob into token_id and blueprint portions
    // {token_id}:{blueprint,tokenSeed}

    function parseBlob(bytes calldata blob) public pure returns (uint256, string memory, string memory) {
        int256 colonIndex = Bytes.indexOf(blob, ":", 0);
        require(colonIndex >= 0, "Separator must exist");
        uint256 tokenID = Bytes.toUint(blob[1:uint256(colonIndex) - 1]);
        bytes calldata blueprint = blob[uint256(colonIndex) + 2:blob.length - 1];
        int256 commaIndex = Bytes.indexOf(blueprint, ",", 0);
        require(commaIndex >= 0, "Separator must exist");
        bytes memory ipfsHash = blueprint[0:uint256(commaIndex)];
        bytes memory tokenSeed = blueprint[uint256(commaIndex) + 1:blueprint.length];
        return (tokenID, string(ipfsHash), string(tokenSeed));
    }
}
