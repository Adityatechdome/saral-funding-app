import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { apiGet } from "@/src/api";
import { colors } from "@/src/theme";

// Roles that can access the admin section at all
const ADMIN_ROLES = new Set(["super_admin", "manager", "expert", "sales_executive", "support_executive"]);

export type AdminRole = "super_admin" | "manager" | "expert" | "sales_executive" | "support_executive" | "user";

/** Which modules each role can access. super_admin always gets everything. */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["users", "schemes", "consultations", "leads", "notifications", "analytics", "settings"],
  manager: ["users", "consultations", "leads", "analytics"],
  expert: ["consultations"],
  sales_executive: ["leads"],
  support_executive: ["consultations", "leads"],
};

export function canAccess(role: string, module: string): boolean {
  if (role === "super_admin") return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(module);
}

export default function AdminLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await apiGet<any>("/auth/me");
        if (!ADMIN_ROLES.has(user?.role)) {
          router.replace("/(tabs)" as any);
        }
      } catch {
        router.replace("/login" as any);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
      }}
    />
  );
}
