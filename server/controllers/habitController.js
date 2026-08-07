const Habit = require("../models/Habit");

const getUserIdFromRequest = (req) => {
    return req.body?.userId || req.query?.userId;
};

const normalizeStoppedHabits = async (userId) => {
    const now = new Date();

    const expiredHabits = await Habit.find({
        user: userId,
        isStopped: false,
        endDate: { $ne: null, $lt: now }
    });

    if (!expiredHabits.length) {
        return;
    }

    const lastHabit = await Habit.findOne({ user: userId }).sort({ order: -1 });
    let nextOrder = lastHabit ? Math.max(lastHabit.order + 1, 99) : 99;

    for (const habit of expiredHabits) {
        habit.isStopped = true;
        habit.order = nextOrder;
        nextOrder += 1;
        await habit.save();
    }
};

const getHabits = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        await normalizeStoppedHabits(userId);

        const showStopped = req.query.showStopped === "true";

        const filter = showStopped ? { user: userId } : { user: userId, isStopped: false };

        const habits = await Habit.find(filter).sort({ order: 1, createdAt: -1 });

        return res.status(200).json(habits);
    } catch (error) {
        return res.status(500).json({
            message: "Error retrieving habits."
        });
    }
};

const createHabit = async (req, res) => {
    try {
        const {
            title,
            type,
            description,
            startDate,
            endDate,
            color,
            targetDefault,
            unit,
            userId
        } = req.body;

        if (!title || !type || !startDate || !targetDefault || !unit || !userId) {
            return res.status(400).json({
                message: "Missing required fields."
            });
        }

        const activeLastHabit = await Habit.findOne({ user: userId, isStopped: false }).sort({ order: -1 });
        const nextOrder = activeLastHabit ? activeLastHabit.order + 1 : 1;

        const newHabit = new Habit({
            title,
            type,
            description,
            startDate,
            endDate: endDate || null,
            color: color || "#4f7cff",
            order: nextOrder,
            targetDefault: Number(targetDefault),
            unit,
            isStopped: false,
            user: userId
        });

        const savedHabit = await newHabit.save();

        return res.status(201).json(savedHabit);
    } catch (error) {
        return res.status(500).json({
            message: "Error creating habit."
        });
    }
};

const updateHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        const allowedFields = [
            "title",
            "type",
            "description",
            "startDate",
            "endDate",
            "color",
            "targetDefault",
            "unit",
            "isStopped"
        ];

        const updates = {};

        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const updatedHabit = await Habit.findOneAndUpdate(
            { _id: id, user: userId },
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedHabit) {
            return res.status(404).json({
                message: "Habit not found."
            });
        }

        return res.status(200).json(updatedHabit);
    } catch (error) {
        return res.status(500).json({
            message: "Error updating habit."
        });
    }
};

const stopHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        const lastHabit = await Habit.findOne({ user: userId }).sort({ order: -1 });
        const stopOrder = lastHabit ? Math.max(lastHabit.order + 1, 99) : 99;

        const updatedHabit = await Habit.findOneAndUpdate(
            { _id: id, user: userId },
            {
                isStopped: true,
                endDate: new Date(),
                order: stopOrder
            },
            { new: true }
        );

        if (!updatedHabit) {
            return res.status(404).json({
                message: "Habit not found."
            });
        }

        return res.status(200).json(updatedHabit);
    } catch (error) {
        return res.status(500).json({
            message: "Error stopping habit."
        });
    }
};

const reorderHabits = async (req, res) => {
    try {
        const { habits, userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "User id is required."
            });
        }

        if (!Array.isArray(habits) || habits.length === 0) {
            return res.status(400).json({
                message: "Habits array is required."
            });
        }

        const updateOperations = habits.map((habit) => ({
            updateOne: {
                filter: { _id: habit.id, user: userId },
                update: { $set: { order: habit.order } }
            }
        }));

        await Habit.bulkWrite(updateOperations);

        const updatedHabits = await Habit.find({ user: userId }).sort({
            order: 1,
            createdAt: -1
        });

        return res.status(200).json(updatedHabits);
    } catch (error) {
        return res.status(500).json({
            message: "Error reordering habits."
        });
    }
};

module.exports = {
    getHabits,
    createHabit,
    updateHabit,
    stopHabit,
    reorderHabits
};
