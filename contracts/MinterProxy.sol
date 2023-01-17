// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface RobotCollection {
    function mintFor(address to, uint256 quantity) external;
}

contract MinterProxy is Ownable {
    using SafeMath for uint256;

    uint256 public totalSupply;

    uint256 MAX_SUPPLY = 999;
    uint256 REMAINING_WHITELIST_SALES = 100;

    uint256 public constant COST_PRICE = 0.02 ether;
    uint256 public constant WHITELIST_PRICE = 0.01 ether;

    event NewMinterDetected(address minter, uint256 quantity);
    event BotMinted(address minter, uint256 tokenId);

    uint16[] robots;

    bytes32 whitelistRoot;

    uint256 saleStat = 0;

    RobotCollection robotCollection;

    constructor(RobotCollection _robotCollection) {
        robotCollection = _robotCollection;
    }

    function addSeeds(uint16[] memory _robotSeeds) external onlyOwner {
        robots = _robotSeeds;
    }

    function setSaleStat(uint256 _stat) external onlyOwner {
        saleStat = _stat;
    }

    function _prepareMint(uint256 numTokens, address to) internal {
        totalSupply = totalSupply.add(numTokens);

        uint256 robotCounts = 0;

        for (uint256 i = 0; i < numTokens; i++) {
            uint256 num = getRandomNum(robots.length);
            uint256 _robotId = uint256(robots[num]);

            if (_robotId > 0) {
                robotCounts = robotCounts.add(1);
            }

            robots[num] = robots[robots.length - 1];
            robots.pop();
        }

        if (robotCounts > 0) {
            robotCollection.mintFor(to, robotCounts);
        }

        emit NewMinterDetected(to, numTokens);
    }

    function mintYourBot(uint256 numTokens) external payable {
        require(saleStat == 2, "PUBLIC_SALE_NOT_STARTED");

        require(totalSupply.add(numTokens) <= MAX_SUPPLY, "EXCEEDS_MAX_SUPPLY");

        require(msg.value >= COST_PRICE * numTokens, "MINT_FAILED");

        _prepareMint(numTokens, msg.sender);
    }

    function mintForWhitelist(uint256 numTokens, bytes32[] calldata proofs) external payable {
        require(saleStat == 1, "WHITELIST_NOT_STARTED");

        require(verifyIfWhiteListed(msg.sender, proofs), "PRROF_INVALID");

        require(msg.value >= WHITELIST_PRICE * numTokens, "MINT_FAILED");

        require(numTokens <= REMAINING_WHITELIST_SALES, "EXCEEDS_SUPPLY");

        REMAINING_WHITELIST_SALES = REMAINING_WHITELIST_SALES.sub(1);

        _prepareMint(numTokens, msg.sender);
    }

    //check if the user is in whitelist
    //user will pass the proofs which is returned from the api

    function verifyIfWhiteListed(address user, bytes32[] calldata merkleProof) public view returns (bool) {
        bytes32 node = keccak256(abi.encodePacked(user));

        return MerkleProof.verify(merkleProof, whitelistRoot, node);
    }

    function setWhitelistRoot(bytes32 _whiteListRoot) external onlyOwner {
        whitelistRoot = _whiteListRoot;
    }

    function withdrawEth(address _treasury) public onlyOwner {
        (bool os, ) = payable(_treasury).call{value: address(this).balance}("");
        require(os);
    }

    function getRandomNum(uint256 upper) internal view returns (uint256) {
        uint256 random = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), block.coinbase, block.difficulty, msg.sender))
        );
        return random % upper;
    }
}
