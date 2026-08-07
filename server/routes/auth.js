const express = require("express");
const router = express.Router();

const { registerUser, loginUser, getUserById, updateUserProfile, updateUserPassword, deleteUser } = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/users/:id", getUserById);
router.patch("/users/:id/profile", updateUserProfile);
router.patch("/users/:id/password", updateUserPassword);
router.delete("/users/:id", deleteUser);

module.exports = router;