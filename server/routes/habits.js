const express = require("express");
const router = express.Router();

const {
    getHabits,
    createHabit,
    updateHabit,
    stopHabit,
    reorderHabits
} = require("../controllers/habitController");

router.get("/", getHabits);
router.post("/", createHabit);
router.patch("/reorder", reorderHabits);
router.patch("/:id/stop", stopHabit);
router.patch("/:id", updateHabit);

module.exports = router;