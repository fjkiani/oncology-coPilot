// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Use a recent Solidity version

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContributionTracker
 * @dev A simple contract to log contribution metadata (type, reference hash) 
 *      associated with a contributor address and timestamp.
 *      Ownership is managed by OpenZeppelin's Ownable contract.
 */
contract ContributionTracker is Ownable {

    // Define the structure for storing contribution metadata
    struct Contribution {
        uint id;                // Unique identifier for the contribution
        address contributor;    // Address of the entity logging the contribution (e.g., backend service)
        string contributionType; // Type of contribution (e.g., "AI_Feedback", "FL_Update")
        bytes32 referenceHash;  // Cryptographic hash of the actual contribution data stored off-chain
        uint timestamp;         // Timestamp when the contribution was logged on the blockchain
    }

    // Mapping from contribution ID to the Contribution struct
    mapping(uint => Contribution) public contributions;

    // Counter to ensure unique contribution IDs
    uint public contributionCounter;

    // Event emitted when a new contribution is logged
    event ContributionLogged(
        uint indexed id,
        address indexed contributor,
        string contributionType,
        bytes32 referenceHash,
        uint timestamp
    );

    /**
     * @dev Contract constructor initializes the contribution counter and sets the deployer as the owner.
     *      Passes the deployer address to the Ownable constructor.
     */
    constructor() Ownable(msg.sender) {
        contributionCounter = 0; // Start counter at 0, first ID will be 0
    }

    /**
     * @dev Logs a new contribution's metadata. Restricted to the contract owner.
     * @param _contributionType The category or type of the contribution.
     * @param _referenceHash The hash representing the off-chain contribution data.
     */
    function logContribution(string memory _contributionType, bytes32 _referenceHash) public onlyOwner {
        uint currentId = contributionCounter;
        address contributorAddress = msg.sender; // The owner calling this function
        uint currentTime = block.timestamp;

        // Create and store the new contribution metadata
        contributions[currentId] = Contribution({
            id: currentId,
            contributor: contributorAddress,
            contributionType: _contributionType,
            referenceHash: _referenceHash,
            timestamp: currentTime
        });

        // Emit an event to notify off-chain listeners
        emit ContributionLogged(
            currentId,
            contributorAddress,
            _contributionType,
            _referenceHash,
            currentTime
        );

        // Increment the counter for the next contribution
        contributionCounter++;
    }

    /**
     * @dev Retrieves the details of a specific contribution by its ID.
     * @param _id The ID of the contribution to retrieve.
     * @return The Contribution struct containing the metadata.
     */
    function getContribution(uint _id) public view returns (Contribution memory) {
        // Reverts if the ID doesn't exist (default mapping behavior for structs is complex)
        // A simple check can be added if needed, but mapping access is standard
        require(_id < contributionCounter, "ContributionTracker: ID out of bounds");
        return contributions[_id];
    }
} 