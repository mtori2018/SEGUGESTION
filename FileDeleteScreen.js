// FileDeleteScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { ref, deleteObject } from 'firebase/storage';
import { doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, storage } from './firebase';

export default function FileDeleteScreen() {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);

  // Función para formatear el RUT
  const formatRUT = (value) => {
    const rutCleaned = value.replace(/[^\dkK]/g, ''); // Eliminar todo lo que no sea dígito o 'K'

    if (rutCleaned.length <= 1) return rutCleaned;

    let rutBody = rutCleaned.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    let rutDigit = rutCleaned.slice(-1);

    return `${rutBody}-${rutDigit}`;
  };

  const handleRutChange = (text) => {
    const formattedRUT = formatRUT(text);
    setSearchText(formattedRUT);
  };

  const validateRUT = (rut) => {
    // Expresión regular para validar el formato RUT con puntos y guión
    const rutPattern = /^(\d{1,2}\.\d{3}\.\d{3}-[\dkK])$/;
    return rutPattern.test(rut);
  };

  const handleSearch = async () => {
    if (!validateRUT(searchText)) {
      Alert.alert("Error", "Por favor, ingrese un RUT válido para buscar.");
      return;
    }

    try {
      const collectionRef = collection(db, `inspections/${searchText}/files`);
      const snapshot = await getDocs(collectionRef);

      const files = snapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
        name: doc.data().name,
        url: doc.data().url,
      }));

      if (files.length === 0) {
        Alert.alert("No encontrado", "No se encontraron archivos asociados a este RUT.");
      }

      setResults(files);
    } catch (error) {
      console.error("Error al buscar archivos: ", error);
      Alert.alert("Error", "Hubo un problema al buscar los archivos.");
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Está seguro de que desea eliminar el archivo ${item.name}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => confirmDelete(item),
        },
      ]
    );
  };

  const confirmDelete = async (item) => {
    try {
      const fileRef = ref(storage, `inspections/${searchText}/files/${item.name}`);

      // Eliminar de Firebase Storage
      await deleteObject(fileRef);

      // Eliminar de Firestore
      const docRef = doc(db, `inspections/${searchText}/files`, item.id);
      await deleteDoc(docRef);

      // Actualizar los resultados para reflejar la eliminación
      setResults(prevResults => prevResults.filter(file => file.id !== item.id));

      Alert.alert("Éxito", "El archivo ha sido eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar el archivo: ", error);
      Alert.alert("Error", "Hubo un problema al eliminar el archivo.");
    }
  };

  const renderResultItem = ({ item }) => (
    <View style={styles.resultItem}>
      <Text style={styles.resultText}>
        {item.type ? item.type.toUpperCase() : 'ARCHIVO'}: {item.name}
      </Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Text style={styles.deleteButtonText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Eliminar Archivos</Text>
      <TextInput
        style={styles.input}
        placeholder="Buscar por RUT"
        value={searchText}
        onChangeText={handleRutChange}
        // Eliminamos el onBlur para evitar la búsqueda automática
        // onBlur={handleSearch}
      />
      {/* Botón para iniciar la búsqueda */}
      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>Buscar</Text>
      </TouchableOpacity>
      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.resultsContainer}
        ListEmptyComponent={<Text style={styles.noResultsText}>No se encontraron resultados</Text>}
      />
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
  searchButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flexGrow: 1,
  },
  resultItem: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    color: '#34495e',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
  },
});
