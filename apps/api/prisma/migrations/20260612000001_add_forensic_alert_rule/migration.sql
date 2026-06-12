-- AlterTable
ALTER TABLE "forensic_alerts" ADD COLUMN "rule" VARCHAR(50);

-- CreateIndex
CREATE INDEX "forensic_alerts_mobile_number_rule_alert_date_idx" ON "forensic_alerts"("mobile_number", "rule", "alert_date");
