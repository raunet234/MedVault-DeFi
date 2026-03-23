const { ethers } = require("ethers");

// Minimal ABI for VerificationEscrow
const ESCROW_ABI = [
  "function requestVerification(address _doctor, string calldata _documentHash, string calldata _documentType) external payable returns (uint256)",
  "function submitAttestation(uint256 _requestId, uint8 _result, string calldata _notes, string calldata _hcsTopicId) external",
];

const RPC_URL = "https://testnet.hashio.io/api";

let provider = null;
let wallet = null;
let escrowContract = null;

function getContract() {
  if (escrowContract) return escrowContract;

  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const contractAddress = process.env.VERIFICATION_ESCROW_ADDRESS;

  if (!privateKey || !contractAddress) {
    console.warn("⚠️  Contract env vars not set — contract calls will return mock responses");
    return null;
  }

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(privateKey, provider);
    escrowContract = new ethers.Contract(contractAddress, ESCROW_ABI, wallet);
    console.log("✅ VerificationEscrow contract connected:", contractAddress);
    return escrowContract;
  } catch (error) {
    console.error("❌ Failed to initialize contract:", error.message);
    return null;
  }
}

/**
 * Submit attestation on-chain via VerificationEscrow.submitAttestation()
 * @param {number|string} requestId - On-chain request ID
 * @param {number} resultCode - 1=Authentic, 2=Suspicious, 3=UnableToVerify
 * @param {string} notes - Attestation notes
 * @param {string} hcsTopicId - HCS topic ID for the attestation
 * @returns {{ txHash: string, mock: boolean }}
 */
async function submitAttestationOnChain(requestId, resultCode, notes, hcsTopicId) {
  const contract = getContract();
  if (!contract) {
    return { txHash: `mock-tx-${Date.now()}`, mock: true };
  }

  try {
    const tx = await contract.submitAttestation(requestId, resultCode, notes || "", hcsTopicId || "");
    const receipt = await tx.wait();
    return { txHash: receipt.hash, mock: false };
  } catch (error) {
    console.error("❌ submitAttestation on-chain failed:", error.message);
    return { txHash: `mock-tx-${Date.now()}`, mock: true, error: error.message };
  }
}

/**
 * Request verification on-chain via VerificationEscrow.requestVerification()
 * @param {string} doctorAddress - Doctor's wallet address
 * @param {string} documentHash - IPFS CID / document hash
 * @param {string} documentType - Type of document
 * @param {number} escrowHBAR - Escrow amount in HBAR (will be converted to tinybars for value)
 * @returns {{ requestId: string, txHash: string, mock: boolean }}
 */
async function requestVerificationOnChain(doctorAddress, documentHash, documentType, escrowHBAR) {
  const contract = getContract();
  if (!contract) {
    return { requestId: `mock-req-${Date.now()}`, txHash: `mock-tx-${Date.now()}`, mock: true };
  }

  try {
    // Convert HBAR to tinybars (1 HBAR = 100,000,000 tinybars) then to wei for EVM
    // On Hedera EVM, msg.value is in tinybars (same as wei)
    const valueInTinybars = BigInt(Math.floor(escrowHBAR * 100_000_000));

    const tx = await contract.requestVerification(doctorAddress, documentHash, documentType, {
      value: valueInTinybars,
    });
    const receipt = await tx.wait();

    // Parse requestId from event logs
    let requestId = null;
    for (const log of receipt.logs) {
      try {
        const iface = new ethers.Interface(ESCROW_ABI);
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "VerificationRequested") {
          requestId = parsed.args[0].toString();
        }
      } catch {
        // Not our event, skip
      }
    }

    return {
      requestId: requestId || "unknown",
      txHash: receipt.hash,
      mock: false,
    };
  } catch (error) {
    console.error("❌ requestVerification on-chain failed:", error.message);
    return { requestId: `mock-req-${Date.now()}`, txHash: `mock-tx-${Date.now()}`, mock: true, error: error.message };
  }
}

module.exports = {
  submitAttestationOnChain,
  requestVerificationOnChain,
};
