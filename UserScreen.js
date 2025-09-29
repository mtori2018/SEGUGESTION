import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getAuth, signOut } from 'firebase/auth';

export default function UserScreen({ onLogout }) {
  const [email, setEmail] = useState('');
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setEmail(user.email);
    }
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        onLogout(); // Actualiza el estado de autenticación en la App.js
      })
      .catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
  };

  return (
    <View style={styles.container}>
      <Image
        style={styles.profileImage}
        source={require('./assets/icon.png')} // Cambia esta imagen si quieres usar una diferente
      />
      <Text style={styles.label}>Correo Electrónico</Text>
      <Text style={styles.text}>{email}</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    borderColor: '#2980b9',
    borderWidth: 3,
  },
  label: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 10,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#34495e',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
