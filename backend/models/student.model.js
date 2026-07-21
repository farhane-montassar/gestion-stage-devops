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
    // Métadonnées du CV (le binaire reste sur le disque / volume Docker).
    // Champ optionnel : les anciens documents sans CV restent valides.
    cv: {
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

module.exports = mongoose.model("Student", studentSchema);