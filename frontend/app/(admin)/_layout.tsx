import { Stack } from "expo-router";
import { Platform } from "react-native";

import { AdminShell } from "@/src/components/AdminShell";
import { colors } from "@/src/theme";

export default function AdminLayout() {
  return (
    <AdminShell>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: Platform.OS === "web" ? "none" : "slide_from_right",
        }}
      />
    </AdminShell>
  );
}
