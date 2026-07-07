const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.get("/", (req, res) => {
  res.send("API Gestion de Stages fonctionne");
});

app.use("/api/students", require("./routes/student.routes"));
app.use("/api/companies", require("./routes/company.routes"));
app.use("/api/offers", require("./routes/offer.routes"));
app.use("/api/applications", require("./routes/application.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});