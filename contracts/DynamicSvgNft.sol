// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DynamicSvgNft is ERC721 {
    // For this type of NFT we are going to need some logic that decides whether the tokenUri returns a smiley face or a frowny face

    uint256 s_tokenCounter;

    constructor(string memory lowSvg, string memory highSvg) ERC721("Dynamic SVG NGT", "DSN") {
        s_tokenCounter = 0;
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter++;
    }
}
