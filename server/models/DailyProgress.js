const mongoose = require("mongoose");

const dailyProgressSchema = new mongoose.Schema(
    {
        habit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Habit",
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        counter: {
            type: Number,
            required: true,
            default: 0
        },
        target: {
            type: Number,
            required: true,
            default: 1
        }
    },
    {
        timestamps: true
    }
);

dailyProgressSchema.index({ habit: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyProgress", dailyProgressSchema);