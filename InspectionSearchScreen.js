// InspectionSearchScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function InspectionSearchScreen() {
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

  const validateRUT = (rut) => {
    const rutPattern = /^(\d{1,2}\.\d{3}\.\d{3}-[\dkK])$/;
    return rutPattern.test(rut);
  };

  const handleSearch = async () => {
    if (!validateRUT(searchText)) {
      Alert.alert("Error", "Por favor, ingrese un RUT válido para buscar.");
      return;
    }

    try {
      const rutToUse = searchText; // Usamos el RUT formateado

      // Buscar archivos en la carpeta de 'files'
      const filesCollectionRef = collection(db, `inspections/${rutToUse}/files`);
      const filesSnapshot = await getDocs(filesCollectionRef);

      if (filesSnapshot.empty) {
        Alert.alert("No encontrado", "No se encontraron archivos asociados a este RUT.");
        setResults([]);
        return;
      }

      const files = filesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        url: doc.data().url,
        type: doc.data().type,
      }));

      // Filtrar archivos por su tipo de extensión
      const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      const excelFiles = files.filter(file => file.name.toLowerCase().endsWith('.xlsx'));

      // Agrega un console.log para verificar los datos
      console.log("PDF Files:", pdfFiles);
      console.log("Excel Files:", excelFiles);

      setResults([...pdfFiles, ...excelFiles]);
    } catch (error) {
      console.error("Error al buscar inspecciones: ", error);
      Alert.alert("Error", "Hubo un problema al buscar los archivos.");
    }
  };

  const handleDownload = async (item) => {
    try {
      const downloadURL = item.url; // Asegurar que el campo correcto se utiliza para la URL

      // Validar que la URL no sea nula
      if (!downloadURL) {
        Alert.alert("Error", "La URL del archivo no es válida.");
        return;
      }

      const fileName = item.name;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadURL,
        FileSystem.documentDirectory + fileName
      );

      const { uri } = await downloadResumable.downloadAsync();

      // Compartir el archivo
      await Sharing.shareAsync(uri);

    } catch (error) {
      console.error("Error al descargar el archivo: ", error);
      Alert.alert("Error", "Hubo un problema al descargar el archivo.");
    }
  };

  const renderResultItem = ({ item }) => (
    <View style={styles.resultItem}>
      <TouchableOpacity style={styles.resultTextContainer} onPress={() => handleDownload(item)}>
        <Text style={styles.resultText}>
          {item.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Excel'}: {item.name}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.downloadButton} onPress={() => handleDownload(item)}>
        <Text style={styles.downloadButtonText}>Descargar {item.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Excel'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Buscar Inspecciones</Text>
      <TextInput
        style={styles.input}
        placeholder="Buscar por RUT"
        value={searchText}
        onChangeText={(text) => {
          const formattedRUT = formatRUT(text.toUpperCase());
          setSearchText(formattedRUT);
        }}
      />
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
  // Tus estilos aquí (sin cambios)
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
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
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
  resultTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  resultText: {
    fontSize: 16,
    color: '#34495e',
  },
  downloadButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
  },
  downloadButtonText: {
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
