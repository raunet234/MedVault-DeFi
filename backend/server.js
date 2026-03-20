const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "../.env" });

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");
const doctorRoutes = require("./routes/doctor");
const marketplaceRoutes = require("./routes/marketplace");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    platform: "MedVault DeFi",
    network: process.env.HEDERA_NETWORK || "testnet",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/marketplace", marketplaceRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🏥 MedVault DeFi Backend running on port ${PORT}`);
  console.log(`   Network: ${process.env.HEDERA_NETWORK || "testnet"}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
