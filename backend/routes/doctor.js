const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { submitMessage } = require("../config/hedera");
const { submitAttestationOnChain, requestVerificationOnChain } = require("../services/contracts");
const supabase = require("../config/supabase");

const router = express.Router();

// In-memory fallback stores (used when Supabase is not configured)
const doctorsMap = new Map();
const verificationRequests = new Map();

// ── Helper: Supabase or Map ──

async function getDoctor(walletAddress) {
  const key = walletAddress.toLowerCase();
  if (supabase) {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("wallet_address", key)
      .single();
    if (error || !data) return null;
    return mapDoctorRow(data);
  }
  return doctorsMap.get(key) || null;
}

async function insertDoctor(doctor) {
  const key = doctor.walletAddress.toLowerCase();
  if (supabase) {
    const { error } = await supabase.from("doctors").insert({
      id: doctor.id,
      wallet_address: key,
      name: doctor.name,
      licence_number: doctor.licenceNumber,
      specialty: doctor.specialty,
      jurisdiction: doctor.jurisdiction,
      verification_fee: doctor.verificationFee,
      trust_score: doctor.trustScore,
      total_verifications: doctor.totalVerifications,
      is_approved: doctor.isApproved,
      credential_nft_id: doctor.credentialNftId,
      earnings: doctor.earnings,
    });
    if (error) throw new Error(`Supabase doctor insert failed: ${error.message}`);
  } else {
    doctorsMap.set(key, doctor);
  }
}

async function updateDoctor(walletAddress, updates) {
  const key = walletAddress.toLowerCase();
  if (supabase) {
    const dbUpdates = {};
    if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;
    if (updates.credentialNftId !== undefined) dbUpdates.credential_nft_id = updates.credentialNftId;
    if (updates.trustScore !== undefined) dbUpdates.trust_score = updates.trustScore;
    if (updates.totalVerifications !== undefined) dbUpdates.total_verifications = updates.totalVerifications;
    if (updates.earnings !== undefined) dbUpdates.earnings = updates.earnings;
    const { error } = await supabase.from("doctors").update(dbUpdates).eq("wallet_address", key);
    if (error) console.error("Supabase doctor update failed:", error.message);
  } else {
    const doc = doctorsMap.get(key);
    if (doc) Object.assign(doc, updates);
  }
}

async function doctorExists(walletAddress) {
  const key = walletAddress.toLowerCase();
  if (supabase) {
    const { count, error } = await supabase
      .from("doctors")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", key);
    return !error && count > 0;
  }
  return doctorsMap.has(key);
}

async function listApprovedDoctors() {
  if (supabase) {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_approved", true);
    if (error) return [];
    return (data || []).map(mapDoctorRow);
  }
  const approved = [];
  for (const [, doctor] of doctorsMap) {
    if (doctor.isApproved) approved.push(doctor);
  }
  return approved;
}

function mapDoctorRow(data) {
  return {
    id: data.id,
    walletAddress: data.wallet_address,
    name: data.name,
    licenceNumber: data.licence_number,
    specialty: data.specialty,
    jurisdiction: data.jurisdiction,
    verificationFee: parseFloat(data.verification_fee) || 5,
    trustScore: data.trust_score || 50,
    totalVerifications: data.total_verifications || 0,
    totalDisputes: 0,
    isApproved: data.is_approved || false,
    credentialNftId: data.credential_nft_id,
    earnings: parseFloat(data.earnings) || 0,
    pendingRequests: [],
    completedAttestations: [],
    registeredAt: data.registered_at,
    approvedAt: null,
  };
}

/**
 * POST /api/doctor/register
 * Register a new doctor
 */
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, name, licenceNumber, specialty, jurisdiction } = req.body;

    if (!walletAddress || !name || !licenceNumber || !specialty) {
      return res.status(400).json({
        error: "Wallet address, name, licence number, and specialty are required",
      });
    }

    if (await doctorExists(walletAddress)) {
      return res.status(409).json({ error: "Doctor already registered" });
    }

    const doctor = {
      id: uuidv4(),
      walletAddress: walletAddress.toLowerCase(),
      name,
      licenceNumber,
      specialty,
      jurisdiction: jurisdiction || "Global",
      verificationFee: 5, // default 5 HBAR
      trustScore: 50,
      totalVerifications: 0,
      totalDisputes: 0,
      isApproved: false,
      credentialNftId: null,
      earnings: 0,
      pendingRequests: [],
      completedAttestations: [],
      registeredAt: new Date().toISOString(),
      approvedAt: null,
    };

    await insertDoctor(doctor);

    res.status(201).json({
      id: doctor.id,
      walletAddress: doctor.walletAddress,
      name: doctor.name,
      specialty: doctor.specialty,
      trustScore: doctor.trustScore,
      isApproved: false,
      message: "Doctor registered. Awaiting admin approval.",
    });
  } catch (error) {
    console.error("Doctor registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/doctor/approve/:walletAddress
 * Admin approves a doctor
 */
router.post("/approve/:walletAddress", async (req, res) => {
  const doctor = await getDoctor(req.params.walletAddress);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  const credentialNftId = `MVDC-${Date.now()}`; // Mock NFT mint
  await updateDoctor(req.params.walletAddress, {
    isApproved: true,
    credentialNftId,
  });

  res.json({
    walletAddress: doctor.walletAddress,
    name: doctor.name,
    isApproved: true,
    credentialNftId,
    message: "Doctor approved. Soulbound NFT credential minted.",
  });
});

/**
 * POST /api/doctor/request-verification
 * Patient requests doctor to verify a record
 */
router.post("/request-verification", async (req, res) => {
  try {
    const { patientWallet, doctorWallet, recordId, escrowAmount } = req.body;

    if (!patientWallet || !doctorWallet || !recordId) {
      return res.status(400).json({ error: "Patient, doctor, and record ID required" });
    }

    const doctor = await getDoctor(doctorWallet);
    if (!doctor || !doctor.isApproved) {
      return res.status(400).json({ error: "Doctor not found or not approved" });
    }

    const request = {
      id: uuidv4(),
      patientWallet: patientWallet.toLowerCase(),
      doctorWallet: doctorWallet.toLowerCase(),
      recordId,
      escrowAmount: escrowAmount || doctor.verificationFee,
      status: "pending",
      attestationResult: null,
      attestationNotes: "",
      hcsTopicId: null,
      createdAt: new Date().toISOString(),
      attestedAt: null,
    };

    verificationRequests.set(request.id, request);
    doctor.pendingRequests.push(request.id);

    // Attempt on-chain request via VerificationEscrow contract
    let txHash = null;
    let onChain = false;
    try {
      const onChainResult = await requestVerificationOnChain(
        doctorWallet,
        recordId,
        "Medical Record",
        request.escrowAmount
      );
      txHash = onChainResult.txHash;
      onChain = !onChainResult.mock;
    } catch (err) {
      console.warn("On-chain requestVerification skipped:", err.message);
    }

    res.status(201).json({
      requestId: request.id,
      doctorName: doctor.name,
      escrowAmount: request.escrowAmount,
      status: "pending",
      txHash,
      onChain,
      message: "Verification request submitted. HBAR escrow locked.",
    });
  } catch (error) {
    console.error("Verification request error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/doctor/attest
 * Doctor submits attestation
 */
router.post("/attest", async (req, res) => {
  try {
    const { requestId, doctorWallet, result, notes } = req.body;

    if (!requestId || !doctorWallet || !result) {
      return res.status(400).json({ error: "Request ID, doctor wallet, and result required" });
    }

    const request = verificationRequests.get(requestId);
    if (!request) {
      return res.status(404).json({ error: "Verification request not found" });
    }
    if (request.doctorWallet !== doctorWallet.toLowerCase()) {
      return res.status(403).json({ error: "Not assigned to this request" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const doctor = await getDoctor(doctorWallet);

    // Submit attestation to HCS
    const hcsResult = await submitMessage(`mock-topic-attestation`, {
      type: "ATTESTATION",
      requestId,
      doctorWallet,
      result,
      notes: notes || "",
      timestamp: new Date().toISOString(),
    });

    request.status = "attested";
    request.attestationResult = result;
    request.attestationNotes = notes || "";
    request.attestedAt = new Date().toISOString();
    request.hcsTopicId = `attestation-${hcsResult.sequenceNumber}`;

    // Update doctor stats
    const newVerifications = (doctor.totalVerifications || 0) + 1;
    const newEarnings = (doctor.earnings || 0) + request.escrowAmount * 0.98;
    await updateDoctor(doctorWallet, {
      totalVerifications: newVerifications,
      earnings: newEarnings,
    });

    // Attempt on-chain attestation via VerificationEscrow contract
    const resultMap = { authentic: 1, suspicious: 2, unable: 3 };
    const resultCode = resultMap[result.toLowerCase()] || 3;
    let txHash = null;
    let onChain = false;
    try {
      const onChainResult = await submitAttestationOnChain(
        requestId,
        resultCode,
        notes || "",
        request.hcsTopicId
      );
      txHash = onChainResult.txHash;
      onChain = !onChainResult.mock;
    } catch (err) {
      console.warn("On-chain submitAttestation skipped:", err.message);
    }

    res.json({
      requestId,
      result,
      hcsTopicId: request.hcsTopicId,
      doctorEarnings: request.escrowAmount * 0.98,
      platformFee: request.escrowAmount * 0.02,
      txHash,
      onChain,
      message: "Attestation submitted and anchored on Hedera.",
    });
  } catch (error) {
    console.error("Attestation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/doctor/pending/:walletAddress
 * Get pending verification requests for a doctor
 */
router.get("/pending/:walletAddress", async (req, res) => {
  const doctor = await getDoctor(req.params.walletAddress);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  const pending = doctor.pendingRequests
    .map((id) => verificationRequests.get(id))
    .filter((r) => r && r.status === "pending");

  res.json({ doctor: doctor.name, pendingRequests: pending });
});

/**
 * GET /api/doctor/profile/:walletAddress
 */
router.get("/profile/:walletAddress", async (req, res) => {
  const doctor = await getDoctor(req.params.walletAddress);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  res.json({
    id: doctor.id,
    walletAddress: doctor.walletAddress,
    name: doctor.name,
    specialty: doctor.specialty,
    jurisdiction: doctor.jurisdiction,
    licenceNumber: doctor.licenceNumber,
    verificationFee: doctor.verificationFee,
    trustScore: doctor.trustScore,
    totalVerifications: doctor.totalVerifications,
    isApproved: doctor.isApproved,
    credentialNftId: doctor.credentialNftId,
    earnings: doctor.earnings,
    registeredAt: doctor.registeredAt,
  });
});

/**
 * GET /api/doctor/list
 * List all approved doctors
 */
router.get("/list", async (req, res) => {
  const approvedDoctors = await listApprovedDoctors();
  res.json({
    doctors: approvedDoctors.map((doctor) => ({
      walletAddress: doctor.walletAddress,
      name: doctor.name,
      specialty: doctor.specialty,
      trustScore: doctor.trustScore,
      verificationFee: doctor.verificationFee,
      totalVerifications: doctor.totalVerifications,
    })),
  });
});

// Export for other routes
router.doctors = doctorsMap;
router.verificationRequests = verificationRequests;

module.exports = router;
