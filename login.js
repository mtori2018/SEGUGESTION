// LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, Alert, StyleSheet, Image, Switch, TouchableOpacity } from 'react-native';
import { auth, firestore } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberUser, setRememberUser] = useState(false);

  useEffect(() => {
    const autoLogin = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('rememberedEmail');
        const storedPassword = await AsyncStorage.getItem('rememberedPassword');

        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          setRememberUser(true);
          handleLogin(storedEmail, storedPassword);
        }
      } catch (error) {
        console.error('Error al cargar las credenciales almacenadas:', error);
      }
    };
    autoLogin();
  }, []);

  const handleLogin = (emailToUse, passwordToUse) => {
    const userEmail = emailToUse || email;
    const userPassword = passwordToUse || password;

    if (!userEmail || !userPassword) {
      setErrorMessage('Por favor, ingresa correo y contraseña.');
      return;
    }

    signInWithEmailAndPassword(auth, userEmail, userPassword)
      .then(async (userCredential) => {
        const user = userCredential.user;

        // Obtener rol del usuario desde Firestore
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.isAdmin ? 'admin' : 'user';

          Alert.alert('Inicio de sesión exitoso', `¡Bienvenido ${user.email}!`);
          setErrorMessage('');
          onLogin(role);

          if (rememberUser) {
            await AsyncStorage.setItem('rememberedEmail', userEmail);
            await AsyncStorage.setItem('rememberedPassword', userPassword);
          } else {
            await AsyncStorage.removeItem('rememberedEmail');
            await AsyncStorage.removeItem('rememberedPassword');
          }

          if (navigation && typeof navigation.replace === 'function') {
            navigation.replace('ProjectForm');
          } else {
            console.error("La propiedad 'replace' de 'navigation' no está definida.");
          }
        } else {
          setErrorMessage('El usuario no tiene un rol asignado.');
        }
      })
      .catch((error) => {
        switch (error.code) {
          case 'auth/invalid-email':
            setErrorMessage('El correo electrónico no es válido.');
            break;
          case 'auth/user-not-found':
            setErrorMessage('No existe un usuario con este correo.');
            break;
          case 'auth/wrong-password':
            setErrorMessage('Contraseña incorrecta.');
            break;
          default:
            setErrorMessage('Ocurrió un error al iniciar sesión.');
            break;
        }
      });
  };

  return (
    <View style={styles.container}>
      <Image source={require('./assets/imagen.jpg')} style={styles.logo} />
      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#7f8c8d"
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        placeholderTextColor="#7f8c8d"
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <View style={styles.rememberUserContainer}>
        <Text style={styles.rememberUserText}>Recordar usuario</Text>
        <Switch
          value={rememberUser}
          onValueChange={setRememberUser}
          trackColor={{ false: '#bdc3c7', true: '#27ae60' }}
          thumbColor="#ecf0f1"
        />
      </View>
      <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin()}>
        <Text style={styles.loginButtonText}>Iniciar sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Fondo blanco
    justifyContent: 'center',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logo: {
    width: 500,
    height: 300,
    marginBottom: 30,
    resizeMode: 'contain',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  rememberUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
    width: '100%',
  },
  rememberUserText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  loginButton: {
    backgroundColor: '#2980b9',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
