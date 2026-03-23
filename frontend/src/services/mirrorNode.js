/**
 * Hedera Mirror Node API service
 * Fetches real HCS topic messages from Hedera Testnet mirror node
 */

export async function fetchTopicMessages(topicId, limit = 10) {
  const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mirror node error: ${res.status}`);
  const data = await res.json();
  return data.messages.map(m => ({
    sequenceNumber: m.sequence_number,
    consensusTimestamp: m.consensus_timestamp,
    message: atob(m.message),  // base64 decode
    runningHash: m.running_hash,
  }));
}
