import { defineRailway, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "CRUK_datahub_landing_page";

export default defineRailway(() => {
  const CRUK_datahub_landing_page = service("CRUK_datahub_landing_page", {
    build: "npm install && npm run build",
    start: "npm run start:prod",
    // builder from CaC: "NIXPACKS"
  });
  return project("CRUK_datahub_landing_page", {
    resources: [CRUK_datahub_landing_page],
  });
});
