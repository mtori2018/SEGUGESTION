// FormularioPDF.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, storage } from './firebase';

const FormularioPDF = () => {
  const [rut, setRut] = useState('');
  const [comments, setComments] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    siniestro: '',
    comuna: '',
    catastroDia: '',
    catastroMes: '',
    catastroAno: '',
    sectores: [],
    summary: '', // Resumen detallado
  });
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const formatRUT = (value) => {
    const rutCleaned = value.replace(/[^\dkK]/g, '');
    
    if (rutCleaned.length <= 1) return rutCleaned;

    let rutBody = rutCleaned.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    let rutDigit = rutCleaned.slice(-1);
    
    return `${rutBody}-${rutDigit}`;
  };

  const handleRutChange = (text) => {
    const formattedRUT = formatRUT(text);
    setRut(formattedRUT);
  };

  const validateRUT = (rut) => {
    const rutPattern = /^(\d{1,2}\.\d{3}\.\d{3}-[\dkK])$/;
    return rutPattern.test(rut);
  };

  const fetchFormData = async (rut) => {
    if (!validateRUT(rut)) {
      Alert.alert('Formato incorrecto', 'El formato del RUT es incorrecto.');
      return;
    }

    console.log('RUT ingresado:', rut);
    setLoading(true);
    try {
      const docRef = doc(db, 'inspections', rut);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('Datos obtenidos:', docSnap.data());
        setFormData(docSnap.data());
      } else {
        console.log('No se encontró documento principal para el RUT:', rut);
        // No alertar aquí, ya que podríamos tener datos en los archivos
        setFormData({
          nombre: '',
          rut: '',
          direccion: '',
          siniestro: '',
          comuna: '',
          catastroDia: '',
          catastroMes: '',
          catastroAno: '',
          sectores: [],
          summary: '', // Reset
        });
      }

      // Obtener la lista de archivos Excel en la carpeta del RUT
      const filesRef = collection(db, `inspections/${rut}/files`);
      const filesSnap = await getDocs(filesRef);

      if (!filesSnap.empty) {
        const filesList = [];
        filesSnap.forEach(doc => {
          const data = doc.data();
          filesList.push({
            id: doc.id,
            ...data,
          });
        });

        // Filtrar solo los archivos Excel
        const excelFiles = filesList.filter(file => file.name.endsWith('.xlsx'));

        if (excelFiles.length > 0) {
          setFiles(excelFiles);

          if (excelFiles.length === 1) {
            // Si solo hay un archivo Excel, seleccionarlo por defecto
            setSelectedFile(excelFiles[0]);
          } else {
            // Si hay múltiples archivos, pedir al usuario que seleccione uno
            setSelectedFile(null);
          }
        } else {
          setFiles([]);
          setSelectedFile(null);
          Alert.alert('No encontrado', 'No se encontraron archivos Excel para el RUT ingresado.');
        }
      } else {
        // No hay archivos en la carpeta files
        Alert.alert('No encontrado', 'No se encontraron archivos para el RUT ingresado.');
        setFiles([]);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error al obtener los datos:', error);
      Alert.alert('Error', 'Hubo un problema al obtener los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar el formData cuando se selecciona un archivo
  useEffect(() => {
    if (selectedFile && rut) {
      // Obtener los datos del archivo seleccionado
      const fetchFileData = async () => {
        try {
          const fileDocRef = doc(db, `inspections/${rut}/files`, selectedFile.id);
          const fileDocSnap = await getDoc(fileDocRef);
          if (fileDocSnap.exists()) {
            const fileData = fileDocSnap.data();
            setFormData({
              ...fileData.formData,
              summary: fileData.summary || '',
            });
          }
        } catch (error) {
          console.error('Error al obtener los datos del archivo seleccionado:', error);
        }
      };
      fetchFileData();
    } else {
      // Resetear formData si no hay archivo seleccionado
      setFormData({
        nombre: '',
        rut: '',
        direccion: '',
        siniestro: '',
        comuna: '',
        catastroDia: '',
        catastroMes: '',
        catastroAno: '',
        sectores: [],
        summary: '', // Reset
      });
    }
  }, [selectedFile, rut]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const compressedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImages([...images, compressedImage.uri]);
    }
  };

  const convertImageToBase64 = async (uri) => {
    if (!uri) {
      console.warn('URI no definida o nula');
      return null;
    }
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error al convertir imagen a base64:', error);
      return null;
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedFile) {
      Alert.alert('Seleccione un archivo', 'Por favor, seleccione un archivo Excel antes de generar el PDF.');
      return;
    }

    const base64Images = await Promise.all(
      images.map(async (uri) => {
        const base64Image = await convertImageToBase64(uri);
        return base64Image ? `<div class="image-container"><img src="${base64Image}" /></div>` : '';
      })
    );
    const imageTags = base64Images.join('');

    const summarySection = formData.summary
      ? `<h2>Resumen Generado</h2><p>${formData.summary.replace(/\n/g, '<br />')}</p>`
      : '';

    const htmlContent = `
      <html>
        <head>
          <style>
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              padding: 16px; 
              background-color: #f9f9f9; 
              color: #333; 
            }
            h1 { 
              text-align: center; 
              font-size: 26px; 
              color: #2c3e50; 
              margin-bottom: 20px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              background-color: #ffffff; 
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
              font-size: 14px; 
            }
            th { 
              background-color: #34495e; 
              color: #ffffff; 
              font-weight: bold; 
            }
            td { 
              background-color: #ecf0f1; 
            }
            .comments { 
              margin-top: 20px; 
              font-size: 15px; 
              color: #2c3e50; 
            }
            .images { 
              display: flex; 
              flex-wrap: wrap; 
              margin-top: 20px; 
            }
            .image-container { 
              margin: 10px; 
              border: 2px solid #ddd; 
              padding: 5px; 
              background-color: #ffffff; 
              border-radius: 5px; 
            }
            .image-container img { 
              width: 300px; 
              height: 225px; 
              border-radius: 5px; 
            }
            h2 { 
              color: #2c3e50; 
              margin-top: 30px; 
            }
            p { 
              font-size: 14px; 
              line-height: 1.6; 
            }
          </style>
        </head>
        <body>
          <h1>Inspección de Siniestro</h1>
          <table>
            <tr>
              <th>Nombre</th>
              <td>${formData.nombre}</td>
            </tr>
            <tr>
              <th>RUT</th>
              <td>${formData.rut}</td>
            </tr>
            <tr>
              <th>Dirección</th>
              <td>${formData.direccion}</td>
            </tr>
            <tr>
              <th>Número de Siniestro</th>
              <td>${formData.siniestro}</td>
            </tr>            
            <tr>
              <th>Comuna</th>
              <td>${formData.comuna}</td>
            </tr>
            <tr>
              <th>Fecha de Siniestro</th>
              <td>${formData.catastroDia.padStart(2, '0')}/${formData.catastroMes.padStart(2, '0')}/${formData.catastroAno}</td>
            </tr>
          </table>
          ${summarySection}
          <p class="comments"><strong>Comentarios:</strong> ${comments}</p>
          <div class="images">
            ${imageTags}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (uri) {
        console.log('PDF generado en:', uri);
        const fileName = selectedFile.name.replace('.xlsx', '.pdf');

        const storageRef = ref(storage, `inspections/${rut}/files/${fileName}`);
        const response = await fetch(uri);
        const blob = await response.blob();

        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);

        const docRef = doc(db, `inspections/${rut}/files`, fileName);
        await setDoc(docRef, {
          name: fileName,
          url: downloadURL,
          uploadedAt: new Date(),
          type: 'pdf',
        });

        console.log('Archivo subido y URL guardada en Firestore:', fileName);
        Alert.alert('Éxito', 'PDF generado y subido correctamente.');

        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error al generar o subir el PDF:', error);
      Alert.alert('Error', 'Hubo un problema al generar o subir el PDF.');
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ marginBottom: 10, fontSize: 18, color: '#34495e' }}>RUT:</Text>
      <TextInput 
        style={{ height: 40, borderColor: '#34495e', borderWidth: 1, marginBottom: 20, paddingHorizontal: 8, borderRadius: 4 }}
        onChangeText={handleRutChange} 
        onBlur={() => fetchFormData(rut)} 
        value={rut} 
        placeholder="XX.XXX.XXX-X"
        placeholderTextColor="#7f8c8d"
      />

      {loading && (
        <View style={{ marginVertical: 10 }}>
          <ActivityIndicator size="large" color="#2980b9" />
        </View>
      )}

      {files.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 10 }}>Seleccione un archivo Excel:</Text>
          <Picker
            selectedValue={selectedFile ? selectedFile.id : null}
            onValueChange={(itemValue, itemIndex) => {
              const file = files.find(f => f.id === itemValue);
              setSelectedFile(file);
            }}
          >
            <Picker.Item label="Seleccione un archivo" value={null} />
            {files.map(file => (
              <Picker.Item key={file.id} label={file.name} value={file.id} />
            ))}
          </Picker>
        </View>
      )}

      <Text style={{ marginBottom: 10, fontSize: 18, color: '#34495e' }}>Comentarios:</Text>
      <TextInput 
        style={{ height: 80, borderColor: '#34495e', borderWidth: 1, marginBottom: 20, paddingHorizontal: 8, borderRadius: 4 }}
        onChangeText={text => setComments(text)} 
        value={comments} 
        multiline 
        placeholder="Escribe tus comentarios aquí..."
        placeholderTextColor="#7f8c8d"
      />

      {formData.sectores && formData.sectores.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 10 }}>Sectores Dañados:</Text>
          {formData.sectores.map((sector, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 16, color: '#2c3e50' }}>{sector.category}</Text>
              <Text style={{ fontSize: 14, color: '#7f8c8d' }}>{sector.subcategory}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={{
          backgroundColor: '#2980b9', 
          padding: 15, 
          borderRadius: 5, 
          alignItems: 'center', 
          marginBottom: 20
        }} 
        onPress={pickImage}
      >
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Subir Imagen</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
        {images.map((imageUri, index) => (
          <Image key={index} source={{ uri: imageUri }} style={{ width: 100, height: 100, marginRight: 10, marginBottom: 10, borderRadius: 5 }} />
        ))}
      </View>

      <TouchableOpacity 
        style={{
          backgroundColor: '#e74c3c', 
          padding: 15, 
          borderRadius: 5, 
          alignItems: 'center'
        }} 
        onPress={handleGeneratePDF}
      >
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Generar PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default FormularioPDF;
