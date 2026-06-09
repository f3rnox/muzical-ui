import type { Metadata } from "next";
import KeyboardShortcutsSettingsPanel from "@/components/KeyboardShortcutsSettingsPanel";

export const metadata: Metadata = {
  title: "Keyboard Shortcuts - Settings - Muzical",
  description: "Keyboard shortcut preferences for Muzical",
};

export default function KeyboardShortcutsSettingsPage() {
  return <KeyboardShortcutsSettingsPanel />;
}
