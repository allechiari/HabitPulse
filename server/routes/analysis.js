const express = require("express");
const router = express.Router();

const { getAnalysisRange } = require("../controllers/analysisController");

router.get("/", getAnalysisRange);

module.exports = router;
