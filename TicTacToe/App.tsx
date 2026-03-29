import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Gamepad2, Swords, UserRound } from "lucide-react-native";
import React from "react";

// Screens
import HomeScreen from "./screens/HomeScreen";
import MatchmakingScreen from "./screens/MatchMakingScreen";
import GameScreen from "./screens/GameScreen";
import ResultScreen from "./screens/ResultScreen";
import LeaderboardScreen from "./screens/LeaderBoardScreen";
import ChallengeScreen from "./screens/ChallengeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CurvedTabBar from "./src/components/CurvedTabBar";

// Types
import type { RootStackParamList, RootTabParamList } from "./src/types/game.types";
export type { RootStackParamList, RootTabParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * The core game flow remains a Stack.
 * This way, Matchmaking, Game, Result, and Leaderboard slide in over the active tab,
 * hiding the bottom navigation bar during gameplay for full immersion.
 */
function PlayStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f0f1a" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Matchmaking" component={MatchmakingScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CurvedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="PlayTab"
          component={PlayStack}
          options={{
            tabBarLabel: "Play",
            tabBarIcon: ({ color, size }) => <Gamepad2 color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="ChallengeTab"
          component={ChallengeScreen}
          options={{
            tabBarLabel: "Challenge",
            tabBarIcon: ({ color, size }) => <Swords color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}