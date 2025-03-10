import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, getDocs, orderBy, limit } from "firebase/firestore";
import ChatItem from "../components/ChatItem";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { View, FlatList, TextInput, Alert, StyleSheet, TouchableOpacity, Text, Modal, Platform } from "react-native";

type ChatListScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, "ChatList">;
};

type ChatItemType = {
    id: string;
    name: string;
    lastMessage?: {
        text: string;
        sender: string;
    };
    lastMessageTimestamp?: number;
};

export default function ChatListScreen({ navigation }: ChatListScreenProps) {
    const [chats, setChats] = useState<ChatItemType[]>([]);
    const [emailToAdd, setEmailToAdd] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const currentUser = auth.currentUser;

    // Refrescar ChatList
    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            fetchChats();
        });

        return unsubscribeFocus;
    }, [navigation]);

    const fetchChats = () => {
        if (!currentUser) return;

        // Obtener chats del usuario actual
        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", currentUser.email)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatsPromises = snapshot.docs.map(async (docSnapshot) => {
                const chatData = docSnapshot.data();

                // Buscar otro participante
                const otherParticipantEmail = chatData.participants.find(
                    (email: string) => email !== currentUser.email
                );

                // Obtener datos del otro participante
                let otherParticipantName = "Usuario";
                if (otherParticipantEmail) {
                    const userRef = doc(db, "usersByEmail", otherParticipantEmail);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        otherParticipantName = userDoc.data().name;
                    }
                }

                // Inicializar valores predeterminados
                let lastMessage = undefined;
                let lastMessageTimestamp = chatData.createdAt ?
                    chatData.createdAt.toMillis() :
                    new Date().getTime(); // Usar la fecha de creación del chat como fallback

                try {
                    const messagesRef = collection(db, "chats", docSnapshot.id, "messages");
                    const messagesQuery = query(
                        messagesRef,
                        orderBy("timestamp", "desc"),
                        limit(1)
                    );

                    // Usar onSnapshot para actualizaciones en tiempo real
                    const messageListener = onSnapshot(messagesQuery, (messagesSnapshot) => {
                        if (!messagesSnapshot.empty) {
                            const lastMessageDoc = messagesSnapshot.docs[0];
                            const messageData = lastMessageDoc.data();
                            const updatedLastMessage = {
                                text: messageData.text || "",
                                sender: messageData.sender || ""
                            };

                            // Obtener timestamp para ordenar
                            const timestamp = messageData.timestamp ?
                                messageData.timestamp.toMillis() :
                                new Date().getTime();

                            // Actualizar solo este chat específico en el estado
                            setChats(prevChats => {
                                const updatedChats = prevChats.map(chat => {
                                    if (chat.id === docSnapshot.id) {
                                        return {
                                            ...chat,
                                            lastMessage: updatedLastMessage,
                                            lastMessageTimestamp: timestamp
                                        };
                                    }
                                    return chat;
                                });

                                // Ordenar los chats después de la actualización
                                return sortChatsByTimestamp(updatedChats);
                            });
                        }
                    });

                    // Obtener inicialmente el último mensaje
                    const messagesSnapshot = await getDocs(messagesQuery);
                    if (!messagesSnapshot.empty) {
                        const lastMessageDoc = messagesSnapshot.docs[0];
                        const messageData = lastMessageDoc.data();
                        lastMessage = {
                            text: messageData.text || "",
                            sender: messageData.sender || ""
                        };

                        // Guardar el timestamp para ordenar
                        if (messageData.timestamp) {
                            lastMessageTimestamp = messageData.timestamp.toMillis();
                        }
                    }
                } catch (error) {
                    console.error("Error obtaining last message:", error);
                }

                return {
                    id: docSnapshot.id,
                    name: otherParticipantName,
                    lastMessage,
                    lastMessageTimestamp
                };
            });

            try {
                const processedChats = await Promise.all(chatsPromises);
                // Ordenar chats por la marca de tiempo del último mensaje
                const sortedChats = sortChatsByTimestamp(processedChats);
                setChats(sortedChats);
            } catch (error) {
                console.error("Error processing chats:", error);
            }
        });

        return unsubscribe;
    };

    // Función auxiliar para ordenar chats
    const sortChatsByTimestamp = (chatsToSort: ChatItemType[]) => {
        return [...chatsToSort].sort((a, b) => {
            // Si no hay último mensaje, usar el timestamp predeterminado (createdAt)
            const timestampA = a.lastMessageTimestamp || 0;
            const timestampB = b.lastMessageTimestamp || 0;

            // Ordenar del más reciente al más antiguo
            return timestampB - timestampA;
        });
    };

    useEffect(() => {
        const unsubscribe = fetchChats();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [currentUser]);

    const handleAddUser = async () => {
        if (!emailToAdd.trim()) {
            Alert.alert("Error", "Porfavor entre un corre electrónico");
            return;
        }

        if (!currentUser) {
            Alert.alert("Error", "Usuario no autenticado");
            return;
        }

        if (emailToAdd === currentUser.email) {
            Alert.alert("Error", "No puedes agregar tu propio contacto");
            return;
        }

        try {
            // Buscar usuario por email
            const userRef = doc(db, "usersByEmail", emailToAdd);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Crear ChatID unico en base a los dos emails involucrados
                const emails = [currentUser.email, emailToAdd].sort();
                const chatId = `chat_${emails[0]}_${emails[1]}`;

                // Revisar si existe el chat
                const chatRef = doc(db, "chats", chatId);
                const chatDoc = await getDoc(chatRef);

                if (chatDoc.exists()) {
                    Alert.alert("Information", "Ya tienes este contacto agregado");
                    return;
                }

                // Obtener nombre de usuario actual
                const currentUserRef = doc(db, "usersByEmail", currentUser.email);
                const currentUserDoc = await getDoc(currentUserRef);
                let currentUserName = "User";

                if (currentUserDoc.exists()) {
                    currentUserName = currentUserDoc.data().name;
                }

                // Crear nuevo documento con el nombre de los participantes y timestamp de creación
                await setDoc(chatRef, {
                    participants: [currentUser.email, emailToAdd],
                    participantsData: {
                        [currentUser.email]: {
                            name: currentUserName
                        },
                        [emailToAdd]: {
                            name: userData.name
                        }
                    },
                    createdAt: new Date(),
                });

                // Limpiar formulario
                setEmailToAdd("");
                setModalVisible(false);

                Alert.alert("Success", `Usuario ${userData.name} agregado a la lista de chats`);
            } else {
                Alert.alert("Error", "No se encontró usuario con ese correo");
            }
        } catch (error) {
            console.error("Error añadiendo usuario:", error);
            Alert.alert("Error", "Error añadiendo usuario. Revise la consola para detalles.");
        }
    };

    const handleLogout = async () => {
        // Para la web
        if (Platform.OS === 'web') {
            // Usar confirmación directa
            if (window.confirm("¿Está seguro que desea cerrar la sesión?")) {
                try {
                    await signOut(auth);
                    navigation.replace("Login");
                } catch (error) {
                    console.error("Error signing out:", error);
                    alert("No se pudo cerrar la sesión");
                }
            }
        } else {
            // Para móviles
            Alert.alert(
                "Cerrar Sesión",
                "¿Está seguro que desea cerrar la sesión?",
                [
                    {
                        text: "Cancelar",
                        style: "cancel"
                    },
                    {
                        text: "Aceptar",
                        onPress: async () => {
                            try {
                                await signOut(auth);
                                navigation.replace("Login");
                            } catch (error) {
                                console.error("Error signing out:", error);
                                Alert.alert("Error", "No se pudo cerrar la sesión");
                            }
                        }
                    }
                ]
            );
        }
    };

    // Boton Logout
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.logoutButton}
                >
                    <Ionicons name="log-out-outline" size={24} color="black" />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    return (
        <View style={styles.container}>
            <FlatList
                style={styles.chatList}
                data={chats}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ChatItem
                        id={item.id}
                        name={item.name}
                        lastMessage={item.lastMessage ? {
                            ...item.lastMessage,
                            timestamp: item.lastMessageTimestamp
                        } : undefined}
                        navigation={navigation}
                    />
                )}
            />

            {/* Modal Agregar Usurio */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Añadir Nuevo Usuario</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Correo Electrónico"
                            value={emailToAdd}
                            onChangeText={setEmailToAdd}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setEmailToAdd("");
                                }}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.addButton]}
                                onPress={handleAddUser}
                            >
                                <Text style={[styles.buttonText, { color: 'white' }]}>Agregar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Boton Modal (+) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative'
    },
    logoutButton: {
        marginRight: 15,
    },
    chatList: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#007AFF',
        borderRadius: 28,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabText: {
        fontSize: 24,
        color: 'white'
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    input: {
        height: 50,
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    modalButton: {
        padding: 10,
        borderRadius: 5,
        width: '48%',
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: '#f2f2f2'
    },
    addButton: {
        backgroundColor: '#007AFF'
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#007AFF'
    }
});