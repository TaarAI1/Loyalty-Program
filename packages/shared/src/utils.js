"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPhoneNumber = formatPhoneNumber;
exports.calculatePoints = calculatePoints;
exports.getExpiryDate = getExpiryDate;
exports.generateBirthdayCode = generateBirthdayCode;
function formatPhoneNumber(number, countryCode = '92') {
    let cleaned = number.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    if (cleaned.startsWith(countryCode)) {
        return cleaned;
    }
    return countryCode + cleaned;
}
function calculatePoints(saleAmount, rewardPercentage) {
    return Math.round((saleAmount * rewardPercentage) / 100);
}
function getExpiryDate(earningDate) {
    const expiry = new Date(earningDate);
    expiry.setDate(expiry.getDate() + 365);
    return expiry;
}
function generateBirthdayCode(customerId, date) {
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `BDAY30-${customerId.slice(0, 8).toUpperCase()}-${yyyymmdd}`;
}
//# sourceMappingURL=utils.js.map