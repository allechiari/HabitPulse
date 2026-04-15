const express = require("express");
const cors = require("cors");
require("dotenv").config();

const habitRoutes = require("./routes/habits");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/habits", habitRoutes);

app.get("/", (req, res) => {
    res.send("HabitPulse API is running");
});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});