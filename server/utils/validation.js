const parseNumber = (value, minimum, includeMinimum) => {
    if (value === undefined || value === null || value === "" || typeof value === "boolean") return null;

    const number = Number(value);
    if (!Number.isFinite(number)) return null;

    const isBelowMinimum = includeMinimum ? number < minimum : number <= minimum;
    return isBelowMinimum ? null : number;
};

const parseNonNegativeNumber = (value) => parseNumber(value, 0, true);
const parsePositiveNumber = (value) => parseNumber(value, 0, false);

const parseDate = (value) => {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isValidDateRange = (startDate, endDate) => {
    return !endDate || startDate <= endDate;
};

module.exports = {
    parseNonNegativeNumber,
    parsePositiveNumber,
    parseDate,
    isValidDateRange
};
