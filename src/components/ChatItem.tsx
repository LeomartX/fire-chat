import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { auth } from "../config/firebase";

type ChatItemProps = {
    id: string;
    name: string;
    lastMessage?: {
        text: string;
        sender: string;
        timestamp?: number;
    };
    navigation: StackNavigationProp<RootStackParamList, "ChatList">;
};

export default function ChatItem({ id, name, lastMessage, navigation }: ChatItemProps) {
    const currentUser = auth.currentUser;

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();

        // Si es hoy, mostrar solo la hora
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Si es esta semana, mostrar el día
        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return days[date.getDay()];
        }

        // Si es este año, mostrar día y mes
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
        }

        // Si es otro año, mostrar día/mes/año
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const renderLastMessage = () => {
        if (!lastMessage) {
            return (
                <View style={styles.lastMessageContainer}>
                    <Text style={[styles.lastMessage, styles.noMessageText]}>
                        Sin mensajes aún
                    </Text>
                </View>
            );
        }

        const isSelf = lastMessage.sender === currentUser?.email;
        const senderName = isSelf ? "Tú" : name;

        // Truncar el mensaje si es muy largo
        const maxLength = 30;
        const displayText = lastMessage.text.length > maxLength
            ? `${lastMessage.text.substring(0, maxLength)}...`
            : lastMessage.text;

        return (
            <View style={styles.lastMessageContainer}>
                <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
                    <Text style={styles.lastMessageSender}>{senderName}: </Text>
                    {displayText}
                </Text>

                {lastMessage.timestamp && (
                    <Text style={styles.timeText}>
                        {formatTime(lastMessage.timestamp)}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => navigation.navigate("Chat", { chatId: id, chatName: name })}
        >
            <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{name}</Text>
                {renderLastMessage()}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    chatInfo: {
        flexDirection: "column",
    },
    chatName: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
    },
    lastMessageContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    lastMessage: {
        fontSize: 14,
        color: "#666",
        flex: 1,
    },
    noMessageText: {
        fontStyle: "italic",
        color: "#999",
    },
    lastMessageSender: {
        fontWeight: "500",
    },
    timeText: {
        fontSize: 12,
        color: "#999",
        marginLeft: 6,
    }
});