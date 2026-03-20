const {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenType,
  TokenSupplyType,
} = require("@hashgraph/sdk");

let client = null;

function getClient() {
  if (client) return client;

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey || accountId === "0.0.XXXXX") {
    console.warn("⚠️  Hedera credentials not configured — running in MOCK mode");
    return null;
  }

  try {
    if (process.env.HEDERA_NETWORK === "mainnet") {
      client = Client.forMainnet();
    } else {
      client = Client.forTestnet();
    }
    client.setOperator(AccountId.fromString(accountId), PrivateKey.fromStringECDSA(privateKey));
    console.log("✅ Hedera client connected:", accountId);
    return client;
  } catch (error) {
    console.error("❌ Failed to initialize Hedera client:", error.message);
    return null;
  }
}

/**
 * Create a new HCS topic for a patient
 */
async function createTopic(memo) {
  const hederaClient = getClient();
  if (!hederaClient) return { topicId: `mock-topic-${Date.now()}`, mock: true };

  const tx = new TopicCreateTransaction().setTopicMemo(memo);
  const response = await tx.execute(hederaClient);
  const receipt = await response.getReceipt(hederaClient);
  return { topicId: receipt.topicId.toString(), mock: false };
}

/**
 * Submit a message to an HCS topic
 */
async function submitMessage(topicId, message) {
  const hederaClient = getClient();
  if (!hederaClient) return { sequenceNumber: Date.now(), mock: true };

  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(JSON.stringify(message));

  const response = await tx.execute(hederaClient);
  const receipt = await response.getReceipt(hederaClient);
  return { sequenceNumber: receipt.topicSequenceNumber.toString(), mock: false };
}

/**
 * Create a soulbound NFT collection for doctor credentials
 */
async function createCredentialNFT() {
  const hederaClient = getClient();
  if (!hederaClient) return { tokenId: `mock-nft-${Date.now()}`, mock: true };

  const tx = new TokenCreateTransaction()
    .setTokenName("MedVault Doctor Credential")
    .setTokenSymbol("MVDC")
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(AccountId.fromString(process.env.HEDERA_ACCOUNT_ID))
    .setSupplyKey(PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY));

  const response = await tx.execute(hederaClient);
  const receipt = await response.getReceipt(hederaClient);
  return { tokenId: receipt.tokenId.toString(), mock: false };
}

module.exports = {
  getClient,
  createTopic,
  submitMessage,
  createCredentialNFT,
};
