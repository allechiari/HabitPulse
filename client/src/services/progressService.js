const PROGRESS_API_URL = "http://localhost:5000/api/progress";

export const getTodayProgress = async (userId) => {
    const response = await fetch(`${PROGRESS_API_URL}/today?userId=${userId}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to load today's progress.");
    }

    return data;
};

export const updateProgressCounter = async (id, counter, userId) => {
    const response = await fetch(`${PROGRESS_API_URL}/${id}/counter`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ counter, userId })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to update counter.");
    }

    return data;
};

export const updateProgressTarget = async (id, target, userId) => {
    const response = await fetch(`${PROGRESS_API_URL}/${id}/target`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ target, userId })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to update target.");
    }

    return data;
};
