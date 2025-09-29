import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Picker } from '@react-native-picker/picker';
import { auth, firestore } from './firebase'; // Asegúrate de que la ruta sea correcta
import { setDoc, doc } from 'firebase/firestore'; 

export default function UserCreationScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Por defecto, el rol es 'user'

  const handleCreateUser = () => {
    createUser();
  };

  const createUser = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Guardar rol en Firestore
      await setDoc(doc(firestore, 'users', userId), { email, role });

      console.log("Usuario creado:", userCredential.user);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.log('Error al crear el usuario:', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Crear Usuario</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Picker
        selectedValue={role}
        style={styles.input}
        onValueChange={(itemValue) => setRole(itemValue)}
      >
        <Picker.Item label="Usuario" value="user" />
        <Picker.Item label="Administrador" value="admin" />
      </Picker>
      <TouchableOpacity style={styles.button} onPress={handleCreateUser}>
        <Text style={styles.buttonText}>Crear Usuario</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f7',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#dfe6e9',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
