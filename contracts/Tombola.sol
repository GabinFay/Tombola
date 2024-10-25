// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;


import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

using OptionsBuilder for bytes;



contract Tombola is OApp {
    uint256 public ticketPrice;
    uint256 public lotteryDuration;
    uint256 public lotteryEndTime;
    address[] public participants;
    address public vrfHandler;
    address public winner;
    bool public lotteryEndingInitiated;
    bool public winnerSelected;
    uint256 public constant CREATOR_FEE = 10; // 10% fee for the creator

    uint256 public s_requestId;
    uint256 public lotteryId;
    // uint256[] public ticketCounts;
    uint256 public totalWei;

    mapping(address => uint256) public participantTicketCounts;
    mapping(address => uint32) public participantSourceChains;
    mapping(address => uint256) public pendingWithdrawals;

    // Message types
    uint8 public constant MSG_BUY_TICKETS = 1;
    uint8 public constant MSG_RECEIVE_PRIZE = 2;

    event TicketPurchased(address buyer, uint256 numberOfTickets);
    event TombolaEnded(address winner, uint256 prize, bool winnerPaid, bool ownerPaid);
    event TombolaEndRequested(uint256 requestId);
    event RandomWordsRequested(uint256 requestId);
    event TombolaEndingStep(string step);
    event NewTombolaStarted(uint256 lotteryId, uint256 ticketPrice, uint256 endTime);

    constructor(
        address _endpoint,
        address _delegate
    ) OApp(_endpoint, _delegate) Ownable(_delegate) {
    }

    function startNewTombola(uint256 _lotteryDuration) public onlyOwner {
        require(winnerSelected || participants.length == 0, "Current lottery not ended");

        lotteryId++;
        lotteryEndTime = block.timestamp + _lotteryDuration;
        lotteryEndingInitiated = false;
        winnerSelected = false;
        winner = address(0);
        for (uint i = 0; i < participants.length; i++) {
            delete participantTicketCounts[participants[i]];
            delete participantSourceChains[participants[i]];
            }
        delete participants;
        totalWei = 0;

        emit NewTombolaStarted(lotteryId, ticketPrice, lotteryEndTime);
    }

    function buyTickets() external payable {
        require(!lotteryEndingInitiated, "Tombola ending initiated");
        require(msg.value > 10^15, "Must put more than 10 cents in the lottery");
        // require(msg.value == ticketPrice * numberOfTickets, "Incorrect payment amount");
        _addParticipant(msg.sender, msg.value,  0); // 0 indicates native chain
    }

    function quoteBuyTicketsCrossChain(
        uint32 _dstEid,
        bytes memory _options) external payable returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(MSG_BUY_TICKETS);
        fee = _quote(_dstEid, payload, _options, false);
        }

    function quoteReceivePrizeCrossChain(
        uint32 _dstEid, uint128 prize, uint128 gaslimit) external payable returns (MessagingFee memory fee) {
        bytes memory options_prize = OptionsBuilder.newOptions().addExecutorLzReceiveOption(gaslimit, prize);
            // Winner is on another chain, send prize back via LayerZero
        bytes memory payload = abi.encode(MSG_RECEIVE_PRIZE, winner);
        fee = _quote(_dstEid, payload, options_prize, false);
        }

    function buyTicketsCrossChain(
        uint32 _dstEid,
        // uint256 gweiamount, // amount of eth in the local chain to send to the lottery (!= wei amount it translates on destination chain)
        // uint256 weivalue,
        // uint256 numberOfTickets,
        bytes memory _options) external payable returns (MessagingReceipt memory receipt) {
        // require(!lotteryEndingInitiated, "Tombola ending initiated");
        // require(numberOfTickets > 0, "Must purchase at least one ticket");
        // uint256 totalCost = ticketPrice * numberOfTickets;

        bytes memory payload = abi.encode(MSG_BUY_TICKETS);
        
        // MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        // require(msg.value >= fee.nativeFee + weivalue, "Insufficient payment");

        receipt = _lzSend(_dstEid, payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
    }



    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        emit LzReceiveStarted(_guid, _payload.length);

        require(_payload.length > 0, "Empty payload");
        // uint8 messageType = uint8(_payload[0]);
        uint8 messageType = uint8(_payload[_payload.length - 1]);
        emit MessageTypeDecoded(messageType);

        if (messageType == MSG_BUY_TICKETS) {
            emit BuyTicketsMessageReceived(_origin.sender, _origin.srcEid);

            address participant = address(uint160(uint256(_origin.sender)));
            emit ParticipantAddressDecoded(participant);

            uint256 amount = msg.value;
            emit AmountReceived(amount);

            _addParticipant(participant, amount, _origin.srcEid);
            emit ParticipantAdded(participant, amount, _origin.srcEid);
        } else if (messageType == MSG_RECEIVE_PRIZE) {
            emit ReceivePrizeMessageReceived();

            // require(_payload.length > 1, "Winner address not given");
            // address crossChainWinner = abi.decode();
            // emit CrossChainWinnerDecoded();

            // bool winnerPaidCross = _safeTransfer(payable(crossChainWinner), msg.value);
            // emit PrizeSent(crossChainWinner, msg.value, winnerPaidCross);
        }
        else {
            emit UnknownMessageTypeReceived(messageType);
            revert("Unknown message type");
        }

        emit LzReceiveCompleted(_guid);
    }

    function _addParticipant(address buyer, uint256 amount, uint32 sourceChain) internal {
        if (participantTicketCounts[buyer] == 0) {
            participants.push(buyer);
        }
        participantTicketCounts[buyer] += amount;
        participantSourceChains[buyer] = sourceChain;
        // ticketCounts.push(numberOfTickets);
        totalWei += amount;
        
        emit TicketPurchased(buyer, amount);
    }

    function endTombola() public {
        require(block.timestamp >= lotteryDuration, "Tombola not yet ended");
        require(!lotteryEndingInitiated, "Tombola ending already initiated");
        require(participants.length > 0, "No participants in the lottery");
        
        lotteryEndingInitiated = true;
        s_requestId = IVRFHandler(vrfHandler).requestRandomWords();

        emit TombolaEndingStep("Tombola ending initiated");
        emit RandomWordsRequested(s_requestId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == vrfHandler, "Only VRF handler can call this function");
        require(s_requestId == requestId, "Wrong requestId");
        require(lotteryEndingInitiated, "Tombola ending not initiated");
        require(participants.length > 0, "No participants");
        require(!winnerSelected, "Winner already selected");
        
        uint256 randomNumber = randomWords[0] % totalWei;
        uint256 sum = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            sum += participantTicketCounts[participants[i]];
            if (randomNumber < sum) {
                winner = participants[i];
                break;
            }
        }
        
        uint256 totalBalance = address(this).balance;
        uint128 prize = uint128(totalBalance * (100 - CREATOR_FEE) / 100);
        uint256 creatorFee = totalBalance - prize;
        
        winnerSelected = true;
        
        uint32 winnerSourceChain = participantSourceChains[winner];
        bool winnerPaid;
        bool ownerPaid;

        if (winnerSourceChain == 0) {
            // Winner is on the native chain, transfer directly
            winnerPaid = _safeTransfer(payable(winner), prize);
        } else {
            // Winner is on another chain, send prize back via LayerZero
                    // uint128 GAS_LIMIT = 100000;
            bytes32 receiverAddressInBytes32 = bytes32(uint256(uint160(winner)));
            bytes memory options_prize = OptionsBuilder.newOptions().addExecutorLzReceiveOption(1000000, 0).addExecutorNativeDropOption(prize, receiverAddressInBytes32);
            bytes memory payload = abi.encode(MSG_RECEIVE_PRIZE);
            // MessagingFee memory fee = _quote(winnerSourceChain, payload, options_prize, false);

            _lzSend(
                winnerSourceChain,
                payload,
                options_prize,  // This is the _options parameter
                MessagingFee(prize, 0),  // Combine prize into MessagingFee struct so that the winner pays for the fees indirectly
                payable(address(this))  // This is the _refundAddress
            );    
            winnerPaid = true; // Assuming LayerZero transfer is successful
        }
        ownerPaid = _safeTransfer(payable(owner()), creatorFee);
        
        // If automatic payout fails, store for manual withdrawal
        if (!winnerPaid) {
            pendingWithdrawals[winner] = prize;
        }
        if (!ownerPaid) {
            pendingWithdrawals[owner()] = creatorFee;
        }
        
        emit TombolaEnded(winner, prize, winnerPaid, ownerPaid);
    }

    function _safeTransfer(address payable recipient, uint256 amount) private returns (bool) {
        (bool success, ) = recipient.call{value: amount, gas: 100000}("");
        return success;
    }

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    function getTombolaBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getWinner() public view returns (address) {
        require(winnerSelected, "Tombola has not ended yet");
        return winner;
    }

    function getTotalWei() external view returns (uint256) {
        return totalWei;
    }

    function withdraw(address payable recipient) public {
        require(owner() == _msgSender() || _msgSender() == recipient, "Not authorized");
        uint256 amount = pendingWithdrawals[recipient];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[recipient] = 0;
        
        (bool success,) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    function getPendingWithdrawal(address addr) public view returns (uint256) {
        return pendingWithdrawals[addr];
    }

    receive() external payable {}

    // Add this function to set the VRF handler address
    function setVRFHandler(address _vrfHandler) external onlyOwner {
        require(_vrfHandler != address(0), "Invalid VRF handler address");
        vrfHandler = _vrfHandler;
    }
}

interface IVRFHandler {
    function requestRandomWords() external returns (uint256);
}

// Add these event declarations at the contract level
event LzReceiveStarted(bytes32 guid, uint256 payloadLength);
event MessageTypeDecoded(uint8 messageType);
event BuyTicketsMessageReceived(bytes32 sender, uint32 srcEid);
event ParticipantAddressDecoded(address participant);
event AmountReceived(uint256 amount);
event ParticipantAdded(address participant, uint256 amount, uint32 srcEid);
event ReceivePrizeMessageReceived();
event CrossChainWinnerDecoded(address winner);
event PrizeSent(address winner, uint256 amount, bool success);
event UnknownMessageTypeReceived(uint8 messageType);
event LzReceiveCompleted(bytes32 guid);
