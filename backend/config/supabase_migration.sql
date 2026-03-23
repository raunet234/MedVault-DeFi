-- MedVault DeFi — Supabase SQL Migration
-- Run this in the Supabase SQL Editor to create the required tables

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  name TEXT,
  did TEXT,
  hcs_topic_id TEXT,
  encryption_key TEXT,
  earnings NUMERIC DEFAULT 0,
  registered_at TIMESTAMPTZ DEFAULT now()
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  name TEXT,
  licence_number TEXT,
  specialty TEXT,
  jurisdiction TEXT,
  verification_fee NUMERIC DEFAULT 5,
  trust_score INTEGER DEFAULT 50,
  total_verifications INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  credential_nft_id TEXT,
  earnings NUMERIC DEFAULT 0,
  registered_at TIMESTAMPTZ DEFAULT now()
);

-- Records table
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_wallet TEXT NOT NULL,
  file_name TEXT,
  document_type TEXT,
  ipfs_cid TEXT,
  document_hash TEXT,
  hcs_topic_id TEXT,
  hcs_sequence_number TEXT,
  verification_status TEXT DEFAULT 'unverified',
  verified_by TEXT,
  is_listed BOOLEAN DEFAULT false,
  listing_price NUMERIC DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_patients_wallet ON patients (wallet_address);
CREATE INDEX IF NOT EXISTS idx_doctors_wallet ON doctors (wallet_address);
CREATE INDEX IF NOT EXISTS idx_records_patient ON records (patient_wallet);
