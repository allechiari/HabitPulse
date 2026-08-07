const express = require("express");
const router = express.Router();

const {
    getTodayProgress,
    updateProgressCounter,
    updateProgressTarget
} = require("../controllers/dailyProgressController");

router.get("/today", getTodayProgress);
router.patch("/:id/counter", updateProgressCounter);
router.patch("/:id/target", updateProgressTarget);

module.exports = router;