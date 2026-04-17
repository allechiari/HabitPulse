/*
Questo è il cuore del backend.
È il file principale del server Express.
*/

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Importazioen Route
const authRoutes = require("./routes/auth");

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

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});