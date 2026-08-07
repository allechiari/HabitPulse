const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Importazioen Route
const authRoutes = require("./routes/auth");
const habitRoutes = require("./routes/habits");
const progressRoutes = require("./routes/progress");
const analysisRoutes = require("./routes/analysis");

const app = express();
const PORT = process.env.PORT || 5000;
// Connessione al database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// ROUTES 
// Route di test
app.get("/", (req, res) => {
    res.send("HabitPulse API is running");
});

// route di login/registrazione 
app.use("/api/auth", authRoutes);
// route di dashboard e progress
app.use("/api/habits", habitRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/analysis", analysisRoutes);

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});
