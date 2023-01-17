// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "erc721a/contracts/extensions/ERC721AQueryable.sol";

contract BBots is ERC721AQueryable, ERC2981, Ownable {
    uint256 immutable MAX_SUPPLY;

    string public tokenBaseURI;

    address minter;

    event AssetMinted(address indexed to, uint256 indexed tokenId, bytes blueprint);

    modifier onlyMinter() {
        require(msg.sender == minter, "NOT AUTHORIZED");
        _;
    }

    constructor(uint256 _maxSupply, address _royaltyReceiver) ERC721A("BubbleBots", "BBOTS") {
        MAX_SUPPLY = _maxSupply;
        _setDefaultRoyalty(_royaltyReceiver, 200);
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mintFor(address to, uint256 quantity) external onlyMinter {
        require(totalSupply() + quantity <= MAX_SUPPLY, "EXCEEDS_SUPPLY");

        _safeMint(to, quantity);
    }

    function updateBaseUri(string memory baseURI) external onlyOwner {
        tokenBaseURI = baseURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return tokenBaseURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseURI(), Strings.toString(tokenId)));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setDefaultRoyalty(address _receiver, uint96 _feeNumerator) external onlyOwner {
        _setDefaultRoyalty(_receiver, _feeNumerator);
    }
}
