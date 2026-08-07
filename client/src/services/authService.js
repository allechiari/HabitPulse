const API_URL = "http://localhost:5000/api/auth";

export const registerUser = async (userData) => {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
    }

    return data;
};

export const loginUser = async (userData) => {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Login failed.");
    }

    return data;
};

export const getUserById = async (id) => {
    const response = await fetch(`${API_URL}/users/${id}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to load user.");
    }

    return data;
};

export const updateUserProfile = async (id, profileData) => {
    const response = await fetch(`${API_URL}/users/${id}/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
    }

    return data;
};

export const updateUserPassword = async (id, passwordData) => {
    const response = await fetch(`${API_URL}/users/${id}/password`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(passwordData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to update password.");
    }

    return data;
};

export const deleteUser = async (id) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to delete account.");
    }

    return data;
};