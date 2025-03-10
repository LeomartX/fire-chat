// In ChatScreen.tsx, update the component:
import React, { useState, useEffect, useRef } from "react";
import { View, TextInput, Button, FlatList, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { auth, db } from "../config/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export default function ChatScreen({ route }) {
    const { chatId, chatName } = route.params;
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const currentUser = auth.currentUser;
    const flatListRef = useRef(null);

    useEffect(() => {
        if (!chatId) return;

        // Suscribirse al chat en tiempo real
        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messageList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(messageList);

            // Deslizar al ultimo mensaje
            if (messageList.length > 0 && flatListRef.current) {
                setTimeout(() => {
                    flatListRef.current.scrollToEnd({ animated: true });
                }, 100);
            }
        });

        return () => unsubscribe();
    }, [chatId]);

    const sendMessage = async () => {
        if (!message.trim() || !currentUser) return;

        try {
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text: message,
                sender: currentUser.email,
                timestamp: serverTimestamp()
            });
            setMessage("");

            // Scroll al enviar mensaje
            if (flatListRef.current) {
                setTimeout(() => {
                    flatListRef.current.scrollToEnd({ animated: true });
                }, 100);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();

        // Tiempo en formato HH:MM
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Si no es de hoy, agregar la fecha
        if (date.toDateString() !== now.toDateString()) {
            return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })} ${timeStr}`;
        }

        return timeStr;
    };

    const renderMessage = ({ item }) => {
        const isCurrentUser = item.sender === currentUser?.email;
        const messageTime = item.timestamp ? formatTime(item.timestamp.toDate()) : '';

        return (
            <View style={[
                styles.messageContainer,
                isCurrentUser ? styles.sentMessage : styles.receivedMessage
            ]}>
                <Text style={styles.messageSender}>
                    {isCurrentUser ? 'Tú' : chatName}
                </Text>
                <Text style={styles.messageText}>{item.text}</Text>
                {messageTime && (
                    <Text style={styles.messageTime}>{messageTime}</Text>
                )}
            </View>
        );
    };

    // Use a different approach for web
    if (Platform.OS === 'web') {
        return (
            <View style={styles.webContainer}>
                <View style={styles.messagesContainer}>
                    <FlatList
                        ref={flatListRef}
                        style={styles.messageList}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        onContentSizeChange={() => {
                            if (messages.length > 0 && flatListRef.current) {
                                flatListRef.current.scrollToEnd({ animated: false });
                            }
                        }}
                    />
                </View>

                <View style={styles.webInputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribe un mensaje..."
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />
                    <Button title="Enviar" onPress={sendMessage} />
                </View>
            </View>
        );
    }

    // Original mobile implementation
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <FlatList
                ref={flatListRef}
                style={styles.messageList}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                onContentSizeChange={() => {
                    if (messages.length > 0 && flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: false });
                    }
                }}
                onLayout={() => {
                    if (messages.length > 0 && flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: false });
                    }
                }}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Escribe un mensaje..."
                    value={message}
                    onChangeText={setMessage}
                    multiline
                />
                <Button title="Enviar" onPress={sendMessage} />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },
    // New styles for web
    webContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    messagesContainer: {
        flex: 1,
        overflow: 'auto',
    },
    webInputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center',
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
    },
    // Original styles
    messageList: {
        flex: 1,
        padding: 10,
    },
    messageContainer: {
        padding: 10,
        marginVertical: 5,
        borderRadius: 10,
        maxWidth: '80%',
    },
    sentMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#DCF8C6',
    },
    receivedMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#ECECEC',
    },
    messageSender: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 16,
    },
    messageTime: {
        fontSize: 10,
        color: '#888',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        padding: 10,
        marginRight: 10,
        maxHeight: 100,
    }
});