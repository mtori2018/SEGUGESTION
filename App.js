// App.js

import React, { useState, useEffect } from 'react'; 
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer'; 
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Image, StyleSheet } from 'react-native';
import ProjectForm from './ProjectForm';
import UserScreen from './UserScreen';
import InspectionSearchScreen from './InspectionSearchScreen';
import LoginScreen from './login';
import UserCreationScreen from './UserCreationScreen';
import EditarPrecio from './EditarPrecio';
import PdfCreator from './PdfCreator'; // Importar PdfCreator
import FileDeleteScreen from './FileDeleteScreen'; // Importar FileDeleteScreen
import { auth, firestore } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Importamos el ProjectFormProvider desde DataContext.js
import { ProjectFormProvider } from './DataContext'; // Asegúrate de que la ruta sea correcta

const Drawer = createDrawerNavigator();

function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // 3 segundos de espera

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('./assets/imagen.jpg')}
        style={styles.splashImage}
        onError={(error) => console.log('Error al cargar la imagen del splash:', error)}
      />
      <Text style={styles.splashText}>Bienvenido a la Aplicación</Text>
    </View>
  );
}

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Nueva inspección"
        onPress={props.onReset}
        style={styles.resetButton}
        labelStyle={styles.resetButtonLabel} // Estilo para la letra blanca
      />
    </DrawerContentScrollView>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('user'); // Inicializamos como 'user'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.isAdmin ? 'admin' : 'user';
          setUserRole(role);
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false); // Ya sea que el usuario esté autenticado o no, se termina la carga
    });

    return () => unsubscribe();
  }, []);

  const handleFinishLoading = () => {
    setIsLoading(false);
  };

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role); // Al iniciar sesión, asignamos el rol del usuario
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('user'); // Resetear el rol al cerrar sesión
    auth.signOut();
  };

  const handleReset = () => {
    setIsLoading(true);
    setIsAuthenticated(true); // Mantenemos al usuario autenticado
    setTimeout(() => {
      setIsLoading(false);
    }, 500); // Esperamos medio segundo para simular una recarga
  };

  if (isLoading) {
    return <SplashScreen onFinish={handleFinishLoading} />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        // Movemos ProjectFormProvider dentro de la autenticación
        <ProjectFormProvider>
          <Drawer.Navigator
            initialRouteName="ProjectForm"
            drawerContent={(props) => <CustomDrawerContent {...props} onReset={handleReset} />}
            screenOptions={{
              headerShown: true,
              drawerPosition: 'left',
            }}
          >
            <Drawer.Screen
              name="ProjectForm"
              component={ProjectForm}
              options={{ title: 'Formulario de Proyecto' }}
            />
            <Drawer.Screen
              name="User"
              component={() => <UserScreen onLogout={handleLogout} />}
              options={{ title: 'Usuario' }}
            />
            <Drawer.Screen
              name="InspectionSearch"
              component={InspectionSearchScreen}
              options={{ title: 'Búsqueda de Inspección' }}
            />
            <Drawer.Screen
              name="PdfCreator"
              component={PdfCreator}
              options={{ title: 'Crear Reporte PDF' }}
            />
            {userRole === 'admin' && (
              <>
                <Drawer.Screen
                  name="UserCreation"
                  component={UserCreationScreen}
                  options={{ title: 'Crear Usuario' }}
                />
                <Drawer.Screen
                  name="EditarPrecio"
                  component={EditarPrecio}
                  options={{ title: 'Editar Precio' }}
                />
                <Drawer.Screen
                  name="FileDeleteScreen"
                  component={FileDeleteScreen}
                  options={{ title: 'Eliminar Archivos' }}
                />
              </>
            )}
          </Drawer.Navigator>
        </ProjectFormProvider>
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  splashImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  splashText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  resetButton: {
    marginTop: 'auto',
    backgroundColor: '#3498db',
  },
  resetButtonLabel: {
    color: '#ffffff', // Color del texto en blanco
    textAlign: 'center', // Centrar el texto horizontalmente
  },
});
