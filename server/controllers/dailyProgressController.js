const Habit = require("../models/Habit");
const DailyProgress = require("../models/DailyProgress");

const getUserIdFromRequest = (req) => {
    return req.body?.userId || req.query?.userId;
};

const getTodayProgress = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const habits = await Habit.find({
            user: userId,
            isStopped: false,
            startDate: { $lte: endOfDay },
            $or: [
                { endDate: null },
                { endDate: { $gte: startOfDay } }
            ]
        }).sort({ order: 1, createdAt: -1 });

        const todayProgressEntries = [];

        for (const habit of habits) {
            let progress = await DailyProgress.findOne({
                habit: habit._id,
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            if (!progress) {
                progress = await DailyProgress.create({
                    habit: habit._id,
                    date: startOfDay,
                    counter: 0,
                    target: habit.targetDefault
                });
            }

            const populatedProgress = await DailyProgress.findById(progress._id).populate("habit");
            todayProgressEntries.push(populatedProgress);
        }

        return res.status(200).json(todayProgressEntries);
    } catch (error) {
        return res.status(500).json({
            message: "Error retrieving today's progress."
        });
    }
};

const updateProgressCounter = async (req, res) => {
    try {
        const { id } = req.params;
        const { counter, userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        if (counter === undefined || counter === null || Number(counter) < 0) {
            return res.status(400).json({
                message: "Counter must be a number greater than or equal to 0."
            });
        }

        const progress = await DailyProgress.findById(id).populate("habit");

        if (!progress || !progress.habit || progress.habit.user?.toString() !== userId) {
            return res.status(404).json({
                message: "Daily progress entry not found."
            });
        }

        progress.counter = Number(counter);
        await progress.save();

        const updatedProgress = await DailyProgress.findById(id).populate("habit");

        return res.status(200).json(updatedProgress);
    } catch (error) {
        return res.status(500).json({
            message: "Error updating progress counter."
        });
    }
};

const updateProgressTarget = async (req, res) => {
    try {
        const { id } = req.params;
        const { target, userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        if (target === undefined || target === null || Number(target) < 0) {
            return res.status(400).json({
                message: "Target must be a number greater than or equal to 0."
            });
        }

        const progress = await DailyProgress.findById(id).populate("habit");

        if (!progress || !progress.habit || progress.habit.user?.toString() !== userId) {
            return res.status(404).json({
                message: "Daily progress entry not found."
            });
        }

        progress.target = Number(target);
        await progress.save();

        await Habit.findOneAndUpdate(
            { _id: progress.habit._id, user: userId },
            { targetDefault: Number(target) }
        );

        const updatedProgress = await DailyProgress.findById(id).populate("habit");

        return res.status(200).json(updatedProgress);
    } catch (error) {
        return res.status(500).json({
            message: "Error updating progress target."
        });
    }
};

module.exports = {
    getTodayProgress,
    updateProgressCounter,
    updateProgressTarget
};
