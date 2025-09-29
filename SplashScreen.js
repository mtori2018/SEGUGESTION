import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    // Simula la carga inicial o espera unos segundos antes de navegar a la pantalla principal
    const timer = setTimeout(() => {
      navigation.replace('Main'); // Cambia a la pantalla principal después de 3 segundos
    }, 3000); // 3 segundos de espera

    return () => clearTimeout(timer); // Limpia el temporizador en caso de que el componente se desmonte
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/imagen.jpg')} // Reemplaza con la ruta de tu imagen
        style={styles.image}
        onError={(error) => console.error('Error cargando la imagen del splash:', error)} // Maneja errores de carga de imagen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Color de fondo del splash
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
});
