// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VRFHandler is VRFConsumerBaseV2Plus {
    uint256 public s_subscriptionId;
    bytes32 public keyHash;
    uint32 public constant callbackGasLimit = 100000;
    uint16 public constant requestConfirmations = 3;
    uint32 public constant numWords = 1;

    uint256 public s_requestId;
    address public lotteryContract;

    event RandomWordsRequested(uint256 requestId);

    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        s_subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    function requestRandomWords() external returns (uint256) {
        require(msg.sender == lotteryContract, "Only lottery contract can request random words");
        s_requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        emit RandomWordsRequested(s_requestId);
        return s_requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        require(s_requestId == requestId, "Wrong requestId");
        ITombola(lotteryContract).fulfillRandomWords(requestId, randomWords);
    }

    function setTombolaContract(address _lotteryContract) external onlyOwner {
        lotteryContract = _lotteryContract;
    }
}

interface ITombola {
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}
