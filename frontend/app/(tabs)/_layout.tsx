import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { LayoutDashboard, ClipboardList, Sparkles, FolderOpen, CircleUser } from "lucide-react-native";

import { colors, fonts } from "@/src/theme";

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
            <TabIcon label="Applications" focused={focused} Icon={ClipboardList} />
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
            <TabIcon label="Advisor" focused={focused} Icon={Sparkles} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Documents" focused={focused} Icon={FolderOpen} />
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
