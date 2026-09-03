"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportType = exports.Gender = exports.TransactionStatus = exports.PointsLedgerReason = exports.NotificationStatus = exports.NotificationChannel = exports.TierName = void 0;
var TierName;
(function (TierName) {
    TierName["Classic"] = "Classic";
    TierName["Silver"] = "Silver";
    TierName["Gold"] = "Gold";
    TierName["Platinum"] = "Platinum";
})(TierName || (exports.TierName = TierName = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["WhatsApp"] = "whatsapp";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["Email"] = "email";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["Pending"] = "pending";
    NotificationStatus["Sent"] = "sent";
    NotificationStatus["Failed"] = "failed";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var PointsLedgerReason;
(function (PointsLedgerReason) {
    PointsLedgerReason["Earned"] = "EARNED";
    PointsLedgerReason["Redeemed"] = "REDEEMED";
    PointsLedgerReason["Expiry"] = "EXPIRY";
    PointsLedgerReason["Manual"] = "MANUAL";
    PointsLedgerReason["TierBonus"] = "TIER_BONUS";
})(PointsLedgerReason || (exports.PointsLedgerReason = PointsLedgerReason = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Completed"] = "completed";
    TransactionStatus["Voided"] = "voided";
    TransactionStatus["Pending"] = "pending";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var Gender;
(function (Gender) {
    Gender["Male"] = "Male";
    Gender["Female"] = "Female";
    Gender["Other"] = "Other";
})(Gender || (exports.Gender = Gender = {}));
var ReportType;
(function (ReportType) {
    ReportType["CustomerTierWise"] = "PCG-9";
    ReportType["BirthdayResponse"] = "BRR7";
    ReportType["TopCustomer"] = "TCR18";
    ReportType["LoyaltySalesDetail"] = "LSD6";
    ReportType["Forensic"] = "SSFR8";
})(ReportType || (exports.ReportType = ReportType = {}));
//# sourceMappingURL=enums.js.map