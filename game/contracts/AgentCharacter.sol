// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AgentCharacter is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Character stats
    struct Stats {
        uint8 intelligence;    // AI processing power
        uint8 resilience;      // System durability
        uint8 influence;       // Network control
        uint8 stealth;        // Data encryption level
        uint8 level;          // Character level
        uint256 experience;   // Experience points
    }

    // Inventory item
    struct Item {
        string name;
        string itemType;  // "weapon", "armor", "program", "data"
        uint8 power;
        bool equipped;
    }

    // Character data
    struct Character {
        string name;
        string class;  // "Netrunner", "Synthmind", "DataHunter", "SystemGuardian"
        Stats stats;
        Item[] inventory;
        uint256 lastAction;    // Timestamp of last action
        string location;       // Current location in the game world
    }

    // Mapping from token ID to Character data
    mapping(uint256 => Character) public characters;

    // Base stats for different classes
    mapping(string => Stats) private baseStats;

    constructor() ERC721("CyberAgent", "CAGT") Ownable(msg.sender) {
        // Initialize base stats for each class
        baseStats["Netrunner"] = Stats(8, 5, 6, 7, 1, 0);
        baseStats["Synthmind"] = Stats(7, 8, 5, 6, 1, 0);
        baseStats["DataHunter"] = Stats(6, 6, 7, 7, 1, 0);
        baseStats["SystemGuardian"] = Stats(5, 8, 7, 6, 1, 0);
    }

    function createCharacter(
        string memory name,
        string memory class,
        string memory uri
    ) public returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(
            keccak256(abi.encodePacked(class)) == keccak256(abi.encodePacked("Netrunner")) ||
            keccak256(abi.encodePacked(class)) == keccak256(abi.encodePacked("Synthmind")) ||
            keccak256(abi.encodePacked(class)) == keccak256(abi.encodePacked("DataHunter")) ||
            keccak256(abi.encodePacked(class)) == keccak256(abi.encodePacked("SystemGuardian")),
            "Invalid class"
        );

        _tokenIds.increment();
        uint256 newCharacterId = _tokenIds.current();
        _mint(msg.sender, newCharacterId);
        _setTokenURI(newCharacterId, uri);

        // Create new character with base stats
        Character storage newChar = characters[newCharacterId];
        newChar.name = name;
        newChar.class = class;
        newChar.stats = baseStats[class];
        newChar.lastAction = block.timestamp;
        newChar.location = "Neo-Tokyo Central Hub";

        return newCharacterId;
    }

    function getCharacter(uint256 tokenId) public view returns (
        string memory name,
        string memory class,
        Stats memory stats,
        uint256 lastAction,
        string memory location
    ) {
        require(_exists(tokenId), "Character does not exist");
        Character storage char = characters[tokenId];
        return (
            char.name,
            char.class,
            char.stats,
            char.lastAction,
            char.location
        );
    }

    function addExperience(uint256 tokenId, uint256 amount) public {
        require(_exists(tokenId), "Character does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not character owner");
        
        Character storage char = characters[tokenId];
        char.stats.experience += amount;
        
        // Level up if enough experience
        while (char.stats.experience >= (char.stats.level * 1000) && char.stats.level < 100) {
            char.stats.level++;
            // Increase stats based on class
            if (keccak256(abi.encodePacked(char.class)) == keccak256(abi.encodePacked("Netrunner"))) {
                char.stats.intelligence++;
                char.stats.stealth++;
            } else if (keccak256(abi.encodePacked(char.class)) == keccak256(abi.encodePacked("Synthmind"))) {
                char.stats.intelligence++;
                char.stats.resilience++;
            } else if (keccak256(abi.encodePacked(char.class)) == keccak256(abi.encodePacked("DataHunter"))) {
                char.stats.influence++;
                char.stats.stealth++;
            } else if (keccak256(abi.encodePacked(char.class)) == keccak256(abi.encodePacked("SystemGuardian"))) {
                char.stats.resilience++;
                char.stats.influence++;
            }
        }
    }

    // Override required functions
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
