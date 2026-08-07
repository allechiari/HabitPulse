const HABIT_API_URL = "http://localhost:5000/api/habits";

export const getHabits = async (showStopped = false, userId) => {
    const response = await fetch(`${HABIT_API_URL}?showStopped=${showStopped}&userId=${userId}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to load habits.");
    }

    return data;
};

export const createHabit = async (habitData) => {
    const response = await fetch(HABIT_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(habitData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to create habit.");
    }

    return data;
};

export const stopHabit = async (id, userId) => {
    const response = await fetch(`${HABIT_API_URL}/${id}/stop?userId=${userId}`, {
        method: "PATCH"
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to stop habit.");
    }

    return data;
};

export const updateHabit = async (id, updates, userId) => {
    const response = await fetch(`${HABIT_API_URL}/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...updates,
            userId
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to update habit.");
    }

    return data;
};

export const reorderHabits = async (habits, userId) => {
    const response = await fetch(`${HABIT_API_URL}/reorder`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ habits, userId })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to reorder habits.");
    }

    return data;
};
