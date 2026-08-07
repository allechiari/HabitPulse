const bcrypt = require("bcryptjs");
const User = require("../models/User");

const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]).{8,}$/;
    return passwordRegex.test(password);
};

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."});
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this email already exists."});
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

        return res.status(201).json({ message: "Registration completed successfully."});
    } catch (error) {
        return res.status(500).json({ message: "Server error during registration." });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Please enter email and password." });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: "No account found with this email."});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password." });
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
        return res.status(500).json({ message: "Server error during login." });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({message: "User not found."});
        }

        return res.status(200).json(user);

    } catch (error) {
        return res.status(500).json({ message: "Error retrieving user."});
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({message: "First name and last name are required."});
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                firstName,
                lastName,
                phone: phone || ""
            },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({message: "User not found."});
        }
        return res.status(200).json({
            message: "Profile updated successfully.",
            user: {
                id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone
            }
        });

    } catch (error) {
        return res.status(500).json({message: "Error updating profile."});
    }
};

const updateUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({message: "Password is required."});
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({message:"Password must be at least 8 characters and include uppercase, lowercase, number, and special character."});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { password: hashedPassword },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({message: "User not found."});
        }
        return res.status(200).json({ message: "Password updated successfully." });

    } catch (error) {
        return res.status(500).json({message: "Error updating password."});
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({message: "User not found."});
        }
        return res.status(200).json({message: "Account deleted successfully."});
    } catch (error) {
        return res.status(500).json({message: "Error deleting account."});
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    updateUserProfile,
    updateUserPassword,
    deleteUser
};
