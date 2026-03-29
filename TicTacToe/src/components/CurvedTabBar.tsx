import React, { useEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Animated, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Gamepad2, Swords, UserRound } from "lucide-react-native";

export default function CurvedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.backgroundView} />
      <View style={styles.contentContainer}>
        {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        // Select the correct Lucide icon
        const renderIcon = (color: string, size: number) => {
          if (route.name === "PlayTab") return <Gamepad2 color={color} size={size} />;
          if (route.name === "ChallengeTab") return <Swords color={color} size={size} />;
          if (route.name === "ProfileTab") return <UserRound color={color} size={size} />;
          return <UserRound color={color} size={size} />;
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.8}
          >
            {isFocused ? (
              // Active State: Floating "Cutout" Circle
              <View style={styles.activeWrapper}>
                <View style={styles.floatingCircle}>
                  {renderIcon("#fff", 24)}
                </View>
                <Text style={styles.activeLabel}>{label as string}</Text>
              </View>
            ) : (
              // Inactive State: Normal Icon inside the bar
              <View style={styles.inactiveWrapper}>
                {renderIcon("rgba(255,255,255,0.4)", 24)}
                <Text style={styles.inactiveLabel}>{label as string}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

const APP_BG_COLOR = "#0f0f1a";   // The main screen background
const NAVBAR_COLOR = "#1a1a2e";   // The color of the floating navbar

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    position: "absolute",
    bottom: 30, // Hovering above the bottom of the screen
    left: 20,
    right: 20,
    height: 70, 
    backgroundColor: "transparent", // Wrapper is transparent to allow overflowing notch safely
  },
  backgroundView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NAVBAR_COLOR,
    borderRadius: 35,
    shadowColor: "#6c63ff",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  activeWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10, // Push inactive items slightly down to balance layout
  },
  floatingCircle: {
    position: "absolute",
    top: -46, // Push the circle up, out of the navbar
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: NAVBAR_COLOR, // Same as navbar, giving the illusion it's attached
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 8, // The magic happens here
    borderColor: APP_BG_COLOR, // Matches screen BG, hiding the rim and carving a "hole" in the navbar
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    marginTop: 38, // Pushed down below the floating circle
  },
  inactiveLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },
});
