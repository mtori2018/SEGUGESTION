import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { firestore } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Importa el JSON local
import elementos from './elementos.json';

export default function EditarPrecio() {
  const [sector, setSector] = useState('');
  const [subsector, setSubsector] = useState('');
  const [material, setMaterial] = useState('');
  const [precio, setPrecio] = useState('');
  const [nuevaPrecio, setNuevaPrecio] = useState('');

  const [subsectors, setSubsectors] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    if (sector) {
      setSubsectors(Object.keys(elementos[sector] || {}));
      setSubsector('');
      setMaterials([]);
    }
  }, [sector]);

  useEffect(() => {
    if (sector && subsector) {
      setMaterials(Object.keys(elementos[sector][subsector] || {}));
      setMaterial('');
    }
  }, [subsector]);

  const fetchPrecio = async () => {
    if (sector && subsector && material) {
      const docRef = doc(firestore, 'Materialidades', sector, subsector, material);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrecio(data.precio);
      } else {
        // Como fallback, obtenemos el precio del JSON local
        const localPrecio = elementos[sector][subsector][material]?.precio;
        setPrecio(localPrecio || 'N/A');
        console.log('No such document in Firestore, fetched from local JSON.');
      }
    }
  };

  useEffect(() => {
    fetchPrecio();
  }, [sector, subsector, material]);

  const handleActualizarPrecio = async () => {
    try {
      const docRef = doc(firestore, 'Materialidades', sector, subsector, material);
      await updateDoc(docRef, { precio: nuevaPrecio });
      setPrecio(nuevaPrecio);
      setNuevaPrecio('');
      console.log('Precio actualizado');
    } catch (error) {
      console.error('Error al actualizar el precio:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Editar Precio</Text>
      <Picker
        selectedValue={sector}
        style={styles.input}
        onValueChange={(itemValue) => setSector(itemValue)}
      >
        <Picker.Item label="Seleccione un sector" value="" />
        {Object.keys(elementos).map((sector) => (
          <Picker.Item key={sector} label={sector} value={sector} />
        ))}
      </Picker>
      <Picker
        selectedValue={subsector}
        style={styles.input}
        onValueChange={(itemValue) => setSubsector(itemValue)}
      >
        <Picker.Item label="Seleccione un subsector" value="" />
        {subsectors.map((subsector) => (
          <Picker.Item key={subsector} label={subsector} value={subsector} />
        ))}
      </Picker>
      <Picker
        selectedValue={material}
        style={styles.input}
        onValueChange={(itemValue) => setMaterial(itemValue)}
      >
        <Picker.Item label="Seleccione un material" value="" />
        {materials.map((material) => (
          <Picker.Item key={material} label={material} value={material} />
        ))}
      </Picker>
      <Text style={styles.label}>Precio actual: {precio}</Text>
      <TextInput
        style={styles.input}
        placeholder="Nuevo precio"
        value={nuevaPrecio}
        onChangeText={setNuevaPrecio}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.button} onPress={handleActualizarPrecio}>
        <Text style={styles.buttonText}>Actualizar Precio</Text>
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
  label: {
    fontSize: 18,
    marginBottom: 10,
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
