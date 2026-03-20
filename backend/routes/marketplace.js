const express = require("express");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// In-memory marketplace store
const listings = new Map();
const purchases = new Map();

/**
 * POST /api/marketplace/list
 * Patient lists a verified record for sale
 */
router.post("/list", (req, res) => {
  try {
    const { patientWallet, recordId, category, description, price } = req.body;

    if (!patientWallet || !recordId || !price) {
      return res.status(400).json({ error: "Patient wallet, record ID, and price required" });
    }

    const listing = {
      id: uuidv4(),
      patientWallet: patientWallet.toLowerCase(),
      recordId,
      category: category || "General",
      description: description || "",
      price: parseFloat(price),
      status: "active",
      totalSales: 0,
      createdAt: new Date().toISOString(),
    };

    listings.set(listing.id, listing);

    res.status(201).json({
      listingId: listing.id,
      price: listing.price,
      category: listing.category,
      status: "active",
      message: "Record listed on marketplace",
    });
  } catch (error) {
    console.error("Listing error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/marketplace/purchase
 * Buy a record — 92% to patient, 8% to platform
 */
router.post("/purchase", (req, res) => {
  try {
    const { listingId, buyerWallet, licenceType } = req.body;

    if (!listingId || !buyerWallet) {
      return res.status(400).json({ error: "Listing ID and buyer wallet required" });
    }

    const listing = listings.get(listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (listing.status !== "active") {
      return res.status(400).json({ error: "Listing not active" });
    }
    if (listing.patientWallet === buyerWallet.toLowerCase()) {
      return res.status(400).json({ error: "Cannot purchase own record" });
    }

    const patientShare = listing.price * 0.92;
    const platformShare = listing.price * 0.08;

    const purchase = {
      id: uuidv4(),
      listingId,
      buyerWallet: buyerWallet.toLowerCase(),
      patientWallet: listing.patientWallet,
      pricePaid: listing.price,
      patientShare,
      platformShare,
      licenceType: licenceType || "research",
      transactionId: `hedera-tx-${Date.now()}`,
      purchasedAt: new Date().toISOString(),
    };

    purchases.set(purchase.id, purchase);
    listing.totalSales++;

    res.status(201).json({
      purchaseId: purchase.id,
      pricePaid: listing.price,
      patientShare,
      platformShare,
      licenceType: purchase.licenceType,
      transactionId: purchase.transactionId,
      message: `Record purchased. ${patientShare} HBAR sent to patient wallet.`,
    });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/listings
 * Browse active marketplace listings
 */
router.get("/listings", (req, res) => {
  const { category, minPrice, maxPrice } = req.query;
  let results = [];

  for (const [, listing] of listings) {
    if (listing.status !== "active") continue;

    if (category && listing.category.toLowerCase() !== category.toLowerCase()) continue;
    if (minPrice && listing.price < parseFloat(minPrice)) continue;
    if (maxPrice && listing.price > parseFloat(maxPrice)) continue;

    results.push({
      id: listing.id,
      category: listing.category,
      description: listing.description,
      price: listing.price,
      totalSales: listing.totalSales,
      createdAt: listing.createdAt,
    });
  }

  res.json({ listings: results, total: results.length });
});

/**
 * GET /api/marketplace/purchases/:buyerWallet
 * Get all purchases by a buyer
 */
router.get("/purchases/:buyerWallet", (req, res) => {
  const buyerPurchases = [];
  for (const [, purchase] of purchases) {
    if (purchase.buyerWallet === req.params.buyerWallet.toLowerCase()) {
      buyerPurchases.push(purchase);
    }
  }
  res.json({ purchases: buyerPurchases });
});

/**
 * DELETE /api/marketplace/delist/:listingId
 * Patient delists a record
 */
router.delete("/delist/:listingId", (req, res) => {
  const listing = listings.get(req.params.listingId);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  listing.status = "delisted";
  res.json({ message: "Record delisted from marketplace" });
});

module.exports = router;
