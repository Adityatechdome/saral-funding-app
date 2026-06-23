import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import {
  LayoutDashboard, ClipboardList, Sparkles, FolderOpen, CircleUser,
  Users, CalendarDays, FileSearch,
} from "lucide-react-native";

import { colors, fonts } from "@/src/theme";
import { apiGet } from "@/src/api";

const TAB_ICON_SIZE = 22;

interface TabIconProps {
  label: string;
  focused: boolean;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

function TabIcon({ label, focused, Icon }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Icon
          size={TAB_ICON_SIZE}
          color={focused ? colors.primary : colors.textDim}
          strokeWidth={focused ? 2.2 : 1.8}
        />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} Icon={LayoutDashboard} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label={isAdmin ? "User Funnel" : "Applications"}
              focused={focused}
              Icon={isAdmin ? Users : ClipboardList}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="funding-case"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="schemes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label={isAdmin ? "Calendly" : "Advisor"}
              focused={focused}
              Icon={isAdmin ? CalendarDays : Sparkles}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              label={isAdmin ? "User Docs" : "Documents"}
              focused={focused}
              Icon={isAdmin ? FileSearch : FolderOpen}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} Icon={CircleUser} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 72,
    paddingTop: 6,
    paddingBottom: 14,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textDim,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
});
