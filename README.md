# MedVault DeFi

**Decentralized Medical Data Verification & Marketplace on Hedera Hashgraph**

> Your Health Data, Verified on Chain. Owned by You.

---

## What It Does

MedVault DeFi lets patients upload encrypted medical records, get them verified by licensed doctors through on-chain attestations, and optionally sell anonymised datasets to researchers — all with HBAR payments and immutable Hedera audit trails. Doctors earn HBAR for verifications and build verifiable on-chain reputations through soulbound NFT credentials. Every record, attestation, and transaction is anchored on Hedera Consensus Service for tamper-proof provenance, while an atomic escrow smart contract ensures doctors only get paid after completing honest verifications.

---

## Hedera Services Used

| Service | How MedVault Uses It |
|---------|---------------------|
| **Hedera Consensus Service (HCS)** | Each patient gets a dedicated HCS topic. Every document upload and doctor attestation is anchored as an immutable, ordered log entry — creating a complete HIPAA-grade audit trail per patient. |
| **Hedera Token Service (HTS)** | Soulbound (non-transferable) NFT credentials are minted for approved doctors, binding their verified medical licence to their wallet address so credentials cannot be sold or faked. |
| **Hedera EVM Smart Contracts** | The VerificationEscrow contract atomically locks patient HBAR, releases 98% to the doctor only after attestation, and holds a 48-hour dispute window — ensuring trust without intermediaries. |

---

## Tech Stack

- **Smart Contracts**: Solidity ^0.8.24 (deployed via Hardhat to Hedera EVM)
- **Backend**: Node.js, Express, ethers.js v6, @hashgraph/sdk
- **Frontend**: React 19, Vite, React Router v7
- **Database**: Supabase (PostgreSQL) with in-memory fallback
- **Storage**: IPFS (encrypted data), AES-256-GCM encryption
- **Auth**: Wallet-based (MetaMask / HashPack)

---

## Prerequisites

- Node.js 18+
- MetaMask or HashPack wallet
- Hedera Testnet account ([portal.hedera.com](https://portal.hedera.com))
- Supabase account (optional — app works with in-memory store)

---

## Setup Instructions

### Step 1: Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/MedVault-DeFi.git
cd MedVault-DeFi
```

### Step 2: Configure environment
```bash
cp .env.example .env
```
Fill in the following values in `.env`:
- `HEDERA_ACCOUNT_ID` — your Hedera testnet account (e.g. `0.0.12345`)
- `HEDERA_PRIVATE_KEY` — ECDSA private key for the account
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon/public key
- `VERIFICATION_ESCROW_ADDRESS` — filled after Step 4

### Step 3: Install all dependencies
```bash
npm run install:all
```

### Step 4: Deploy smart contracts
```bash
cd contracts && npx hardhat run scripts/deploy.js --network hedera_testnet
```
Copy the deployed `VerificationEscrow` address into your `.env`.

### Step 5: Run the application
```bash
npm run dev
```
This starts both the backend (port 5000) and frontend (port 5173).

---

## Live Demo

🔗 **[Live Demo](#)** — *coming soon*

---

## Demo Video

🎥 **[Watch Demo](#)** — *coming soon*

---

## Smart Contract Addresses (Hedera Testnet)

| Contract | Address |
|----------|---------|
| VerificationEscrow | `TBD` |
| DoctorRegistry | `TBD` |
| DataMarketplace | `TBD` |
| PatientConsent | `TBD` |

---

## Business Model Canvas

| | |
|---|---|
| **Key Partners** | Hedera ecosystem, medical licence verification APIs (NMC India, GMC UK), IPFS storage providers |
| **Key Activities** | Doctor credentialing & onboarding, medical record verification, data marketplace operations |
| **Key Resources** | HCS topic infrastructure, AES-256 encryption system, verified doctor network, escrow smart contracts |
| **Value Propositions** | **Patients**: Own and monetise your health data, 92% revenue share on sales · **Doctors**: Earn HBAR for verifications, build verifiable on-chain reputation · **Researchers**: Access consented, doctor-verified health datasets |
| **Customer Relationships** | Self-service web portal, doctor onboarding support, dispute resolution via admin panel |
| **Channels** | Direct web app, medical college partnerships, doctor LinkedIn groups, Hedera ecosystem |
| **Customer Segments** | Patients in markets with poor EMR access (India, SEA) · Verified doctors seeking supplemental income · Healthcare researchers and pharma companies |
| **Cost Structure** | Hedera transaction fees (~$0.001/tx), IPFS storage costs, compute infrastructure, compliance |
| **Revenue Streams** | 2% verification escrow fee, 8% marketplace commission, premium doctor profile listings |

---

## License

MIT
