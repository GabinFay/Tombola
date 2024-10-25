import { EndpointId } from "@layerzerolabs/lz-definitions";
const amoy_testnetContract = {
    eid: EndpointId.AMOY_V2_TESTNET,
    contractName: "Tombola"
};
const basesep_testnetContract = {
    eid: EndpointId.BASESEP_V2_TESTNET,
    contractName: "Tombola"
};
export default { contracts: [{ contract: amoy_testnetContract }, { contract: basesep_testnetContract }], connections: [{ from: amoy_testnetContract, to: basesep_testnetContract, config: { sendLibrary: "0x1d186C560281B8F1AF831957ED5047fD3AB902F9", receiveLibraryConfig: { receiveLibrary: "0x53fd4C4fBBd53F6bC58CaE6704b92dB1f360A648", gracePeriod: 0 }, sendConfig: { executorConfig: { maxMessageSize: 10000, executor: "0x4Cf1B3Fa61465c2c907f82fC488B43223BA0CF93" }, ulnConfig: { confirmations: 1, requiredDVNs: ["0x55c175DD5b039331dB251424538169D8495C18d1"], optionalDVNs: [], optionalDVNThreshold: 0 } }, receiveConfig: { ulnConfig: { confirmations: 1, requiredDVNs: ["0x55c175DD5b039331dB251424538169D8495C18d1"], optionalDVNs: [], optionalDVNThreshold: 0 } } } }, { from: basesep_testnetContract, to: amoy_testnetContract, config: { sendLibrary: "0xC1868e054425D378095A003EcbA3823a5D0135C9", receiveLibraryConfig: { receiveLibrary: "0x12523de19dc41c91F7d2093E0CFbB76b17012C8d", gracePeriod: 0 }, sendConfig: { executorConfig: { maxMessageSize: 10000, executor: "0x8A3D588D9f6AC041476b094f97FF94ec30169d3D" }, ulnConfig: { confirmations: 1, requiredDVNs: ["0xe1a12515F9AB2764b887bF60B923Ca494EBbB2d6"], optionalDVNs: [], optionalDVNThreshold: 0 } }, receiveConfig: { ulnConfig: { confirmations: 1, requiredDVNs: ["0xe1a12515F9AB2764b887bF60B923Ca494EBbB2d6"], optionalDVNs: [], optionalDVNThreshold: 0 } } } }] };
