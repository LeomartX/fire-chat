import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ActivityIndicator, View } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ChatListScreen from "./src/screens/ChatListScreen";
import ChatScreen from "./src/screens/ChatScreen";
import { auth } from "./src/config/firebase";
import { onAuthStateChanged } from "firebase/auth";

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    ChatList: undefined;
    Chat: { chatId: string; chatName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName={user ? "ChatList" : "Login"}>
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ChatList"
                    component={ChatListScreen}
                    options={{ title: "Chats" }}
                />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={({ route }) => ({ title: route.params.chatName })}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}