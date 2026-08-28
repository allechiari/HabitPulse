const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ["habit", "vice"],
            required: true
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            default: null
        },
        color: {
            type: String,
            default: "#4f7cff"
        },
        order: {
            type: Number,
            required: true,
            default: 1
        },
        targetDefault: {
            type: Number,
            required: true,
            default: 1,
            min: 0
        },
        unit: {
            type: String,
            required: true,
            default: "times",
            trim: true
        },
        isStopped: {
            type: Boolean,
            default: false
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Habit", habitSchema);
