const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    sector: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true
    },
    // Métadonnées du logo (le binaire reste sur le disque / volume Docker).
    // Champ optionnel : les anciens documents sans logo restent valides.
    logo: {
      type: {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String,
        uploadedAt: Date
      },
      default: undefined,
      _id: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Company", companySchema);