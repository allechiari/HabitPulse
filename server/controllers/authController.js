const bcrypt = require("bcryptjs");
const User = require("../models/User");

const isStrongPassword = (password) => {
    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]).{8,}$/;

    return passwordRegex.test(password);
};

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                message: "Please fill in all required fields."
            });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone
        });
        await newUser.save();

        return res.status(201).json({
            message: "Registration completed successfully."
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error during registration."
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password."
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({
                message: "No account found with this email."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: "Incorrect password."
            });
        }

        return res.status(200).json({
            message: "Login successful.",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error during login."
        });
    }
};

module.exports = {
    registerUser,
    loginUser
};