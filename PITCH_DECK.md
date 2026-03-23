# MedVault DeFi — Pitch Deck Content

## Hedera Hello Future Apex Hackathon 2026

---

## Slide 1: Why Hedera — Not Ethereum, Not Solana

### 1. HCS Ordered Audit Logs for Medical Record Provenance

HIPAA requires healthcare entities to maintain complete, tamper-proof audit trails of who accessed, created, or modified patient records. Hedera Consensus Service provides deterministic message ordering with cryptographic timestamps — meaning every document upload, verification, and attestation in MedVault has an immutable, court-admissible sequence. Unlike append-only databases, HCS logs cannot be modified by system administrators, which is the exact guarantee health regulators need.

### 2. Predictable Fees Under $0.01 — No Gas Auctions

A doctor in rural India verifying a medical record for 5 HBAR ($0.25) cannot afford a gas spike that makes the attestation transaction cost more than the fee itself. Ethereum gas prices have exceeded $50 per transaction during congestion. Hedera's fixed-fee model ($0.0001 for HCS messages, <$0.01 for smart contract calls) makes micro-verification payments economically viable in emerging markets where MedVault operates.

### 3. 3–5 Second Deterministic Finality

When a doctor attests that a medical document is authentic, that attestation must be legally final — not "probably final after 12 confirmations." Hedera provides deterministic finality in 3–5 seconds. This matters because probabilistic finality (Ethereum ~12 minutes, Solana ~occasional rollbacks) creates a legal grey zone: if a verification is rolled back, who is liable? Hedera eliminates this entirely. An attestation submitted is an attestation finalised.

### 4. Carbon-Negative Network for Healthcare ESG Mandates

Major hospital networks and pharmaceutical companies have ESG commitments that prohibit engagement with carbon-intensive infrastructure. Ethereum PoS reduced energy use but is not carbon-negative. Hedera has purchased carbon offsets exceeding its energy consumption, making it the only major DLT that healthcare institutions with sustainability mandates can adopt without board-level pushback.

---

## Slide 2: Hedera Services We Use — And How

### Hedera Consensus Service (HCS)

Every patient in MedVault gets a dedicated HCS topic at registration. We anchor three types of messages: document uploads (IPFS CID + hash), doctor attestations (result + notes), and marketplace transactions. This topic-per-patient architecture gives each patient a complete, time-ordered medical provenance ledger that no one — not even MedVault — can alter. Doctors and researchers can independently verify any record by reading the HCS topic directly from a mirror node, without trusting our backend.

### Hedera Token Service (HTS)

When an admin approves a doctor after licence verification, we mint a soulbound (non-transferable) NFT credential to their wallet. Non-transferability is critical: medical licences are personal — a doctor cannot sell or delegate their authority to prescribe or verify. The NFT acts as an on-chain proof of credentialing. If a doctor's licence is revoked, the NFT can be frozen, immediately removing their ability to accept verification requests.

### Hedera EVM Smart Contracts

The VerificationEscrow contract is the trust engine. When a patient requests verification, their HBAR is locked in the contract. The doctor submits an on-chain attestation (authentic / suspicious / unable to verify). After attestation, 98% of the escrow goes to the doctor and 2% to the platform treasury — but only after a 48-hour dispute window. If the patient disputes, an admin resolves it. This atomic escrow-release mechanism means neither party needs to trust the other or the platform.

---

## Slide 3: Team

### [YOUR NAME]

**Role**: Full-stack Blockchain Developer

**Background**: [YOUR BACKGROUND]

**Built for this hackathon**:
- 4 Solidity smart contracts (VerificationEscrow, DoctorRegistry, DataMarketplace, PatientConsent)
- Node.js/Express backend with Hedera SDK integration and Supabase persistence
- React frontend with wallet auth, file encryption, HCS explorer, and data marketplace
- End-to-end HIPAA-grade encryption pipeline (AES-256-GCM + IPFS)

> **Solo submission** — all components designed, built, and deployed during the 5-week hackathon period.
