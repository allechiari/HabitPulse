const ANALYSIS_API_URL = "http://localhost:5000/api/analysis";

export const getAnalysisData = async (startDate, endDate, userId) => {
    const response = await fetch(`${ANALYSIS_API_URL}?startDate=${startDate}&endDate=${endDate}&userId=${userId}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to load analysis data.");
    }

    return data;
};
