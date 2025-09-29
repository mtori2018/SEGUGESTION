// SectionForm.js

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles } from './styles';

export default function SectionForm({ section, sectionIndex, sections, setSections, dataJson }) {
  // Maneja cambios en los inputs de la sección
  const handleInputChange = (key, value) => {
    const newSections = [...sections];
    newSections[sectionIndex].realCounts[key] = value;
    setSections(newSections);
  };

  const handlePercentageChange = (key, value) => {
    const newSections = [...sections];
    newSections[sectionIndex].realCounts[`${key}.percentage`] = value;
    setSections(newSections);
  };

  const handleMeasurementChange = (key, value) => {
    if (!isNaN(value)) {
      const newSections = [...sections];
      newSections[sectionIndex].measurements[key] = value;
      setSections(newSections);
    }
  };

  const resetInputs = () => {
    const newSections = [...sections];
    newSections[sectionIndex].realCounts = {};
    newSections[sectionIndex].discountRates = {};
    newSections[sectionIndex].measurements = { length: '', width: '', height: '' };
    setSections(newSections);
  };

  const sendSectionData = () => {
    const newSections = [...sections];
    newSections[sectionIndex].tempData = {
      ...newSections[sectionIndex].realCounts,
      measurements: { ...newSections[sectionIndex].measurements }
    };
    newSections[sectionIndex].confirmationMessage = `Datos enviados: ${newSections[sectionIndex].selectedCategories.map(sc => sc.subcategory).join(', ')}`;
    setSections(newSections);
  };

  const handleCategoryChange = (itemValue, subcategoryIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories[subcategoryIndex].category = itemValue;
    newSections[sectionIndex].selectedCategories[subcategoryIndex].subcategory = 'Seleccione subcategoría';
    newSections[sectionIndex].confirmationMessage = '';
    setSections(newSections);
  };

  const handleSubcategoryChange = (itemValue, subcategoryIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories[subcategoryIndex].subcategory = itemValue;
    newSections[sectionIndex].confirmationMessage = '';
    setSections(newSections);
  };

  const handleSectorNameChange = (text) => {
    const newSections = [...sections];
    newSections[sectionIndex].name = text.toUpperCase();
    setSections(newSections);
  };

  const addSubcategory = () => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories.push({ category: 'Área dañada', subcategory: 'Seleccione subcategoría' });
    setSections(newSections);
  };

  const confirmDeleteSection = () => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta sección?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: deleteSection }
      ]
    );
  };

  const deleteSection = () => {
    const newSections = sections.filter((_, index) => index !== sectionIndex);
    setSections(newSections);
  };

  const confirmDeleteSubcategory = (subcategoryIndex) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta subcategoría?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: () => deleteSubcategory(subcategoryIndex) }
      ]
    );
  };

  const deleteSubcategory = (subcategoryIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories = newSections[sectionIndex].selectedCategories.filter((_, index) => index !== subcategoryIndex);
    setSections(newSections);
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTOR {sectionIndex + 1}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteSection}>
          <Text style={styles.deleteButtonText}>Eliminar Sección</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.sectorInput}
        placeholder="Nombre del Sector"
        value={section.name}
        onChangeText={(text) => handleSectorNameChange(text.toUpperCase())}
        autoCapitalize="characters"
      />
      <View style={styles.measurementsContainer}>
        <TextInput
          style={styles.measurementInput}
          placeholder="Largo"
          value={section.measurements.length}
          onChangeText={(text) => handleMeasurementChange('length', text)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.measurementInput}
          placeholder="Ancho"
          value={section.measurements.width}
          onChangeText={(text) => handleMeasurementChange('width', text)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.measurementInput}
          placeholder="Alto"
          value={section.measurements.height}
          onChangeText={(text) => handleMeasurementChange('height', text)}
          keyboardType="numeric"
        />
      </View>
      {section.selectedCategories.map((selectedCategory, subcategoryIndex) => (
        <View key={subcategoryIndex}>
          <Picker
            selectedValue={selectedCategory.category}
            style={styles.picker}
            onValueChange={(itemValue) => handleCategoryChange(itemValue, subcategoryIndex)}
          >
            <Picker.Item label="Área dañada" value="Área dañada" />
            {Object.keys(dataJson).map((categoryKey) => (
              <Picker.Item key={categoryKey} label={categoryKey.toUpperCase()} value={categoryKey} />
            ))}
          </Picker>
          <Picker
            selectedValue={selectedCategory.subcategory}
            style={styles.picker}
            onValueChange={(itemValue) => handleSubcategoryChange(itemValue, subcategoryIndex)}
          >
            <Picker.Item label="Seleccione subcategoría" value="Seleccione subcategoría" />
            {selectedCategory.category !== 'Área dañada' && dataJson[selectedCategory.category] && Object.keys(dataJson[selectedCategory.category]).map((subcategoryKey) => (
              <Picker.Item key={subcategoryKey} label={subcategoryKey.toUpperCase()} value={subcategoryKey} />
            ))}
          </Picker>
          <ScrollView style={styles.itemScrollView}>
            <View>
              <Text style={styles.subcategoryHeader}>{selectedCategory.subcategory.toUpperCase()}</Text>
              {selectedCategory.category !== 'Área dañada' && selectedCategory.subcategory !== 'Seleccione subcategoría' && dataJson[selectedCategory.category] && dataJson[selectedCategory.category][selectedCategory.subcategory] && Object.keys(dataJson[selectedCategory.category][selectedCategory.subcategory]).map((item, subIndex) => (
                <View key={subIndex} style={styles.itemContainer}>
                  <Text style={styles.itemHeader}>  {item.toUpperCase()}</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}></Text>
                    <Switch
                      value={section.realCounts[`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.unidad`] === "1"}
                      onValueChange={(value) => handleInputChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.unidad`, value ? "1" : "0")}
                    />
                    {item === "deteccion de fuga de agua" || item === "Análisis Y Diagnóstico Circuito Eléctrico" ? (
                      <View>
                        <Text> {dataJson[selectedCategory.category][selectedCategory.subcategory][item]?.medida || ''}</Text>
                        {item === "deteccion de fuga de agua" ? (
                          <TextInput
                            style={styles.input}
                            placeholder="Ingrese precio"
                            keyboardType="numeric"
                            value={section.realCounts[`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.precioManual`] || ''}
                            onChangeText={(text) => handleInputChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.precioManual`, text)}
                          />
                        ) : (
                          <TextInput
                            style={styles.input}
                            placeholder="Ingrese cantidad de puntos eléctricos"
                            keyboardType="numeric"
                            value={section.realCounts[`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.cantidadPuntos`] || ''}
                            onChangeText={(text) => handleInputChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.cantidadPuntos`, text)}
                          />
                        )}
                      </View>
                    ) : (
                      <Picker
                        selectedValue={section.realCounts[`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.percentage`] || "100"}
                        style={styles.picker}
                        onValueChange={(itemValue) => handlePercentageChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}`, itemValue)}
                      >
                        <Picker.Item label="100%" value="100" />
                        <Picker.Item label="90%" value="90" />
                        <Picker.Item label="80%" value="80" />
                        <Picker.Item label="70%" value="70" />
                        <Picker.Item label="60%" value="60" />
                        <Picker.Item label="50%" value="50" />
                        <Picker.Item label="40%" value="40" />
                        <Picker.Item label="30%" value="30" />
                        <Picker.Item label="20%" value="20" />
                        <Picker.Item label="10%" value="10" />
                      </Picker>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          {subcategoryIndex > 0 && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteSubcategory(subcategoryIndex)}>
              <Text style={styles.deleteButtonText}>Eliminar Subcategoría</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addSubcategoryButton} onPress={addSubcategory}>
        <Text style={styles.addSubcategoryButtonText}>Añadir Subcategoría</Text>
      </TouchableOpacity>
      {section.confirmationMessage ? (
        <Text style={styles.confirmationMessage}>{section.confirmationMessage}</Text>
      ) : null}
    </View>
  );
}
