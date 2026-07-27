const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
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
    level: {
      type: String,
      required: true
    },
    domain: {
      type: String,
      required: true
    },
    skills: {
      type: [String],
      default: []
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true
    },
    // Métadonnées du CV (le binaire est stocké sur Cloudinary).
    // Champ optionnel : les anciens documents sans CV restent valides.
    //  - url       : secure_url Cloudinary (ou ancienne URL locale /uploads/...)
    //  - publicId  : identifiant Cloudinary pour le remplacement / la suppression
    //  - filename  : conservé pour les anciens fichiers locaux (rétro-compat)
    cv: {
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

module.exports = mongoose.model("Student", studentSchema);