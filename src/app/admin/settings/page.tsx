

import { redirect } from "next/navigation";

// This page is now a container for sub-pages.
// Redirect to the default personalization page.
export default function SettingsPage() {
  redirect("/admin/settings/personalization");
}
