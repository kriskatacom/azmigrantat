import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mobileProfile = readFileSync("../src/app/user/[id].tsx", "utf8");
const mobileFeed = readFileSync("../src/components/video/home-video-feed.tsx", "utf8");
const apiRoutes = readFileSync("../../../auth/routes/web.php", "utf8");
const apiReport = readFileSync("../../../auth/app/Controllers/Api/ReportController.php", "utf8");
const moderationQueue = readFileSync("../../../auth/app/Controllers/ModerationController.php", "utf8");
const migration = readFileSync(
  "../../../auth/database/migrations/20261031000000_create_content_reports_table.php",
  "utf8",
);
const privacy = readFileSync("../../../google-play-release/legal-site/public/privacy/index.html", "utf8");
const terms = readFileSync("../../../google-play-release/legal-site/public/terms/index.html", "utf8");
const deletion = readFileSync(
  "../../../google-play-release/legal-site/public/account-deletion/index.html",
  "utf8",
);

describe("UGC moderation and legal release contract", () => {
  it("offers user and video reporting in the mobile application", () => {
    expect(mobileProfile).toContain('showReportDialog(token, "user"');
    expect(mobileProfile).toContain('showReportDialog(token, "video"');
    expect(mobileFeed).toContain('showReportDialog(token, "video"');
  });

  it("stores authenticated reports and exposes an admin review queue", () => {
    expect(apiRoutes).toContain("/api/mobile/reports");
    expect(apiReport).toContain("$this->authenticatedUser()");
    expect(apiReport).toContain("whereIn('status', ['pending', 'reviewing'])");
    expect(apiReport).toContain("'active_key' => hash('sha256'");
    expect(moderationQueue).toContain("moderator_notes");
    expect(moderationQueue).toContain("reviewed_by");
    expect(migration).toContain("public function up(): void");
    expect(migration).toContain("public function down(): void");
    expect(migration).toContain("uk_content_reports_active");
    expect(migration).toContain("Destructive rollback is disabled");
  });

  it("prepares standalone public privacy, terms, and account deletion pages", () => {
    expect(privacy).toContain("Политика за поверителност");
    expect(terms).toContain("Общи условия");
    expect(deletion).toContain("Изтриване на акаунт");
    for (const page of [privacy, terms, deletion]) {
      expect(page).toContain('href="/legal.css"');
      expect(page).toContain('name="viewport"');
    }
  });
});
