import React, { useState } from "react";
import {View, TextInput, Alert, StyleSheet, Text, TouchableOpacity, Platform} from "react-native";
import { auth, db } from "../config/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, "Register">;

export default function RegisterScreen({ navigation }: { navigation: RegisterScreenNavigationProp }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleRegister = async () => {
        // Validar campos vacíos
        if (!email.trim() || !password.trim() || !name.trim()) {
            Alert.alert("Error", "Todos los campos son obligatorios");
            return;
        }

        // Validar formato de correo
        if (!validateEmail(email)) {
            Alert.alert("Error", "Por favor ingrese un correo electrónico válido");
            return;
        }

        // Validar longitud de contraseña
        if (password.length < 8) {
            Alert.alert("Error", "La contraseña debe tener al menos 8 caracteres");
            return;
        }

        try {
            // Crear usuario con autenticación de Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Guardar usuario con su ID
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                name: name,
                createdAt: new Date(),
            });

            // También crear referenciade usuario por email para buscar más rápido
            await setDoc(doc(db, "usersByEmail", email), {
                uid: user.uid,
                name: name
            });

            // Logoute después de registrar
            await auth.signOut();

            // Mostrar alerta de éxito y navegar a Login
            if (Platform.OS === 'web') {
                // Para web, usar un enfoque diferente
                alert("Registro Exitoso. Su cuenta ha sido creada exitosamente.");
                navigation.navigate("Login");
            } else {
                // Para móvil, mantener el enfoque actual
                Alert.alert(
                    "Registro Exitoso",
                    "Su cuenta ha sido creada exitosamente. Por favor inicie sesión.",
                    [{ text: "OK", onPress: () => navigation.navigate("Login") }]
                );
            }
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert("Error", "Este correo electrónico ya está registrado");
            } else if (error.code === 'auth/invalid-email') {
                Alert.alert("Error", "El formato del correo electrónico es inválido");
            } else if (error.code === 'auth/weak-password') {
                Alert.alert("Error", "La contraseña es demasiado débil");
            } else {
                Alert.alert("Error", "No se pudo registrar el usuario: " + error.message);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.title}>Crear Cuenta</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nombre"
                    onChangeText={setName}
                    value={name}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Correo Electrónico"
                    onChangeText={setEmail}
                    value={email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    secureTextEntry
                    onChangeText={setPassword}
                    value={password}
                />
                <TouchableOpacity
                    style={styles.registerButton}
                    onPress={handleRegister}
                >
                    <Text style={styles.registerButtonText}>Registrarse</Text>
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <Text style={styles.loginLink}>Inicia Sesión</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    formContainer: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
        paddingHorizontal: 15,
        backgroundColor: '#f9f9f9',
    },
    registerButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    registerButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginText: {
        color: '#666',
    },
    loginLink: {
        color: '#007AFF',
        fontWeight: '600',
    },
});