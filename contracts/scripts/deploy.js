const hre = require("hardhat");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying REMAINING contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const platformTreasury = deployer.address;

  // Hedera EVM requires explicit gas overrides
  const gasOverrides = {
    gasLimit: 4_000_000,
  };

  // Already deployed:
  console.log("\n--- Already Deployed ---");
  console.log("DoctorRegistry:      0x704673A4FFd248a1FC04f5968F423a3733e3bC94");
  console.log("VerificationEscrow:  0xD54848f20874600879e1773D3daD325950077e01");

  // 3. Deploy DataMarketplace
  console.log("\n--- Deploying DataMarketplace ---");
  await delay(5000); // Wait to avoid rate limiting
  const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
  const dataMarketplace = await DataMarketplace.deploy(platformTreasury, gasOverrides);
  await dataMarketplace.waitForDeployment();
  const dataMarketplaceAddress = await dataMarketplace.getAddress();
  console.log("DataMarketplace deployed to:", dataMarketplaceAddress);

  // 4. Deploy PatientConsent
  console.log("\n--- Deploying PatientConsent ---");
  await delay(5000); // Wait to avoid rate limiting
  const PatientConsent = await hre.ethers.getContractFactory("PatientConsent");
  const patientConsent = await PatientConsent.deploy(gasOverrides);
  await patientConsent.waitForDeployment();
  const patientConsentAddress = await patientConsent.getAddress();
  console.log("PatientConsent deployed to:", patientConsentAddress);

  // Summary
  console.log("\n========================================");
  console.log("  MedVault DeFi — Deployment Summary");
  console.log("========================================");
  console.log(`  DoctorRegistry:      0x704673A4FFd248a1FC04f5968F423a3733e3bC94`);
  console.log(`  VerificationEscrow:  0xD54848f20874600879e1773D3daD325950077e01`);
  console.log(`  DataMarketplace:     ${dataMarketplaceAddress}`);
  console.log(`  PatientConsent:      ${patientConsentAddress}`);
  console.log(`  Platform Treasury:   ${platformTreasury}`);
  console.log("========================================\n");

  console.log("Add these to your .env file:");
  console.log(`DOCTOR_REGISTRY_ADDRESS=0x704673A4FFd248a1FC04f5968F423a3733e3bC94`);
  console.log(`VERIFICATION_ESCROW_ADDRESS=0xD54848f20874600879e1773D3daD325950077e01`);
  console.log(`DATA_MARKETPLACE_ADDRESS=${dataMarketplaceAddress}`);
  console.log(`PATIENT_CONSENT_ADDRESS=${patientConsentAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
