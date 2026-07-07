const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    location: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    level: {
      type: String,
      required: true
    },
    domain: {
      type: String,
      required: true
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Offer", offerSchema);