const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { authenticateToken } = require("../middleware/auth");
const { encrypt, generateKey, hashData } = require("../services/encryption");
const { uploadToIPFS, retrieveFromIPFS } = require("../services/ipfs");
const { createTopic, submitMessage } = require("../config/hedera");
const supabase = require("../config/supabase");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// In-memory fallback stores (used when Supabase is not configured)
const patientsMap = new Map();
const recordsMap = new Map();

// ── Helper: Supabase or Map ──

async function getPatient(walletAddress) {
  const key = walletAddress.toLowerCase();
  if (supabase) {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("wallet_address", key)
      .single();
    if (error || !data) return null;
    // Map DB row to app shape
    return {
      id: data.id,
      walletAddress: data.wallet_address,
      name: data.name,
      did: data.did,
      hcsTopicId: data.hcs_topic_id,
      encryptionKey: data.encryption_key,
      records: [], // records are fetched separately
      earnings: parseFloat(data.earnings) || 0,
      registeredAt: data.registered_at,
    };
  }
  return patientsMap.get(key) || null;
}

async function upsertPatient(patient) {
  const key = patient.walletAddress.toLowerCase();
  if (supabase) {
    const { error } = await supabase.from("patients").upsert({
      id: patient.id,
      wallet_address: key,
      name: patient.name,
      did: patient.did,
      hcs_topic_id: patient.hcsTopicId,
      encryption_key: patient.encryptionKey,
      earnings: patient.earnings || 0,
    }, { onConflict: "wallet_address" });
    if (error) throw new Error(`Supabase patient upsert failed: ${error.message}`);
  } else {
    patientsMap.set(key, patient);
  }
}

async function getRecord(recordId) {
  if (supabase) {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("id", recordId)
      .single();
    if (error || !data) return null;
    return mapRecordRow(data);
  }
  return recordsMap.get(recordId) || null;
}

async function insertRecord(record) {
  if (supabase) {
    const { error } = await supabase.from("records").insert({
      id: record.id,
      patient_wallet: record.patientWallet,
      file_name: record.fileName,
      document_type: record.documentType,
      ipfs_cid: record.ipfsCid,
      document_hash: record.documentHash,
      hcs_topic_id: record.hcsTopicId,
      hcs_sequence_number: record.hcsSequenceNumber?.toString() || null,
      verification_status: record.verificationStatus || "unverified",
      verified_by: record.verifiedBy || null,
      is_listed: record.isListed || false,
      listing_price: record.listingPrice || 0,
    });
    if (error) throw new Error(`Supabase record insert failed: ${error.message}`);
  } else {
    recordsMap.set(record.id, record);
  }
}

async function getPatientRecordsFromDB(walletAddress) {
  const key = walletAddress.toLowerCase();
  if (supabase) {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("patient_wallet", key)
      .order("uploaded_at", { ascending: false });
    if (error) return [];
    return (data || []).map(mapRecordRow);
  }
  // Fallback: iterate map
  const patient = patientsMap.get(key);
  if (!patient) return [];
  return patient.records.map((id) => recordsMap.get(id)).filter(Boolean);
}

function mapRecordRow(data) {
  return {
    id: data.id,
    patientWallet: data.patient_wallet,
    fileName: data.file_name,
    documentType: data.document_type,
    ipfsCid: data.ipfs_cid,
    documentHash: data.document_hash,
    hcsTopicId: data.hcs_topic_id,
    hcsSequenceNumber: data.hcs_sequence_number,
    verificationStatus: data.verification_status,
    verifiedBy: data.verified_by,
    isListed: data.is_listed,
    listingPrice: parseFloat(data.listing_price) || 0,
    uploadedAt: data.uploaded_at,
  };
}

/**
 * POST /api/patient/register
 * Register a new patient
 */
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, name, dateOfBirth, country } = req.body;

    if (!walletAddress || !name) {
      return res.status(400).json({ error: "Wallet address and name required" });
    }

    const existing = await getPatient(walletAddress);
    if (existing) {
      return res.status(409).json({ error: "Patient already registered" });
    }

    // Create HCS topic for this patient
    const { topicId, mock } = await createTopic(`MedVault-Patient-${walletAddress.slice(0, 8)}`);

    const patient = {
      id: uuidv4(),
      walletAddress: walletAddress.toLowerCase(),
      name,
      dateOfBirth: dateOfBirth || null,
      country: country || null,
      did: `did:hedera:testnet:${walletAddress.toLowerCase()}`,
      hcsTopicId: topicId,
      encryptionKey: generateKey(),
      records: [],
      earnings: 0,
      registeredAt: new Date().toISOString(),
      mock,
    };

    await upsertPatient(patient);

    res.status(201).json({
      id: patient.id,
      walletAddress: patient.walletAddress,
      did: patient.did,
      hcsTopicId: topicId,
      name: patient.name,
      message: "Patient registered successfully",
    });
  } catch (error) {
    console.error("Patient registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/patient/upload
 * Upload and encrypt a medical record
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { walletAddress, documentType, description } = req.body;
    const file = req.file;

    if (!walletAddress || !file) {
      return res.status(400).json({ error: "Wallet address and file required" });
    }

    const patient = await getPatient(walletAddress);
    if (!patient) {
      return res.status(404).json({ error: "Patient not registered" });
    }

    // Encrypt the file
    const encryptionKey = patient.encryptionKey;
    const { encrypted, iv, tag } = encrypt(file.buffer, encryptionKey);

    // Upload encrypted data to IPFS
    const { cid, mock: ipfsMock } = await uploadToIPFS(encrypted, file.originalname);

    // Create document hash for on-chain anchoring
    const documentHash = hashData(file.buffer);

    // Anchor on HCS
    const hcsResult = await submitMessage(patient.hcsTopicId, {
      type: "DOCUMENT_UPLOAD",
      cid,
      documentHash,
      documentType: documentType || "General",
      timestamp: new Date().toISOString(),
      patientDid: patient.did,
    });

    const record = {
      id: uuidv4(),
      patientWallet: walletAddress.toLowerCase(),
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      documentType: documentType || "General",
      description: description || "",
      ipfsCid: cid,
      documentHash,
      encryptionIv: iv,
      encryptionTag: tag,
      hcsTopicId: patient.hcsTopicId,
      hcsSequenceNumber: hcsResult.sequenceNumber,
      verificationStatus: "unverified",
      verifiedBy: null,
      attestationResult: null,
      isListed: false,
      listingPrice: 0,
      uploadedAt: new Date().toISOString(),
    };

    await insertRecord(record);

    // Also update in-memory fallback if using it
    if (!supabase && patientsMap.has(walletAddress.toLowerCase())) {
      patientsMap.get(walletAddress.toLowerCase()).records.push(record.id);
    }

    res.status(201).json({
      id: record.id,
      fileName: record.fileName,
      documentType: record.documentType,
      ipfsCid: cid,
      documentHash,
      hcsTopicId: patient.hcsTopicId,
      verificationStatus: "unverified",
      message: "Record uploaded and anchored successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/patient/records/:walletAddress
 * Get all records for a patient
 */
router.get("/records/:walletAddress", async (req, res) => {
  const patient = await getPatient(req.params.walletAddress);
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const patientRecords = await getPatientRecordsFromDB(req.params.walletAddress);

  const recordsList = patientRecords.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    documentType: r.documentType,
    description: r.description,
    ipfsCid: r.ipfsCid,
    verificationStatus: r.verificationStatus,
    verifiedBy: r.verifiedBy,
    attestationResult: r.attestationResult,
    isListed: r.isListed,
    listingPrice: r.listingPrice,
    uploadedAt: r.uploadedAt,
  }));

  res.json({
    patient: {
      name: patient.name,
      did: patient.did,
      walletAddress: patient.walletAddress,
      earnings: patient.earnings,
      hcsTopicId: patient.hcsTopicId,
    },
    records: recordsList,
  });
});

/**
 * GET /api/patient/profile/:walletAddress
 */
router.get("/profile/:walletAddress", async (req, res) => {
  const patient = await getPatient(req.params.walletAddress);
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const patientRecords = await getPatientRecordsFromDB(req.params.walletAddress);

  res.json({
    name: patient.name,
    walletAddress: patient.walletAddress,
    did: patient.did,
    hcsTopicId: patient.hcsTopicId,
    totalRecords: patientRecords.length,
    earnings: patient.earnings,
    registeredAt: patient.registeredAt,
  });
});

// Export records map for other routes (fallback)
router.records = recordsMap;
router.patients = patientsMap;

module.exports = router;
