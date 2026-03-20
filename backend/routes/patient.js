const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { authenticateToken } = require("../middleware/auth");
const { encrypt, generateKey, hashData } = require("../services/encryption");
const { uploadToIPFS, retrieveFromIPFS } = require("../services/ipfs");
const { createTopic, submitMessage } = require("../config/hedera");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// In-memory patient store (use PostgreSQL in production)
const patients = new Map();
const records = new Map();

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

    if (patients.has(walletAddress.toLowerCase())) {
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

    patients.set(walletAddress.toLowerCase(), patient);

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

    const patient = patients.get(walletAddress.toLowerCase());
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

    records.set(record.id, record);
    patient.records.push(record.id);

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
router.get("/records/:walletAddress", (req, res) => {
  const patient = patients.get(req.params.walletAddress.toLowerCase());
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const patientRecords = patient.records.map((id) => {
    const r = records.get(id);
    return {
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
    };
  });

  res.json({
    patient: {
      name: patient.name,
      did: patient.did,
      walletAddress: patient.walletAddress,
      earnings: patient.earnings,
    },
    records: patientRecords,
  });
});

/**
 * GET /api/patient/profile/:walletAddress
 */
router.get("/profile/:walletAddress", (req, res) => {
  const patient = patients.get(req.params.walletAddress.toLowerCase());
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  res.json({
    name: patient.name,
    walletAddress: patient.walletAddress,
    did: patient.did,
    hcsTopicId: patient.hcsTopicId,
    totalRecords: patient.records.length,
    earnings: patient.earnings,
    registeredAt: patient.registeredAt,
  });
});

// Export records map for other routes
router.records = records;
router.patients = patients;

module.exports = router;
