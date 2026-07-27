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
    // Métadonnées du logo (le binaire est stocké sur Cloudinary).
    // Champ optionnel : les anciens documents sans logo restent valides.
    //  - url       : secure_url Cloudinary (ou ancienne URL locale /uploads/...)
    //  - publicId  : identifiant Cloudinary pour le remplacement / la suppression
    //  - filename  : conservé pour les anciens fichiers locaux (rétro-compat)
    logo: {
      type: {
        filename: String,
        publicId: String,
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