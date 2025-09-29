// utils.js

import * as FileSystem from 'expo-file-system';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { styles } from './styles';

// Función para calcular el total basado en la medida
export const calculateTotal = (unidad, largo, ancho, altura, medida) => {
  let total = 0;

  if (medida === 'M2') {
    total = unidad * largo * ancho;
  } else if (medida === 'ML') {
    total = (ancho * 2) + (largo * 2);
  } else if (medida === 'M2.') {
    total = (ancho * altura * 2) + (largo * altura * 2);
  } else {
    total = unidad;
  }

  return Math.round(total * 10) / 10; // Con un decimal
};

// Función para formatear valores monetarios
export const formatCurrency = (value) => {
  return Math.round(value); // Redondear a números enteros
};

// Función para generar las filas del Excel basadas en los datos proporcionados
export const generateRows = (data, realCounts, measurements, startIndex) => {
  const rows = [];
  let rowIndex = startIndex;

  for (const category in data) {
    for (const section in data[category]) {
      let sectionRows = [[section.toUpperCase(), "", "", "", "", "", "", "", ""]];
      let sectionStartIndex = rowIndex + 1;
      rowIndex++;

      let sectionValid = false;

      for (const item in data[category][section]) {
        const { unidad = "", precio = 0, medida = "" } = data[category][section][item] || {};
        const realCount = realCounts[`${category}.${section}.${item}.unidad`] || "0";
        const percentage = realCounts[`${category}.${section}.${item}.percentage`] || "100";
        const largo = measurements.length || 1;
        const ancho = measurements.width || 1;
        const altura = measurements.height || 1;

        // Comprobar si hay un precio manual ingresado
        let precioUnitario = realCounts[`${category}.${section}.${item}.precioManual`]
          ? parseFloat(realCounts[`${category}.${section}.${item}.precioManual`])
          : parseFloat(precio); // Usa el precio predeterminado si no hay manual

        // Calcular el total de acuerdo a las medidas
        let total = calculateTotal(realCount, largo, ancho, altura, medida);

        // Aplicar el porcentaje después de calcular el total
        total = total * (parseFloat(percentage) / 100);

        // Calcular el precio total usando el precio manual si está disponible
        const totalPrice = total * precioUnitario;

        if (realCount !== "0" && realCount !== "") {
          sectionValid = true;

          let calculatedTotal = calculateTotal(realCount, largo, ancho, altura, medida);
          let discountedTotal = calculatedTotal * (parseFloat(percentage) / 100); // Aplicar el porcentaje aquí

          const totalPrice = discountedTotal * precioUnitario;

          rows.push([
            "     " + item.toUpperCase(),
            "", "", "", medida, discountedTotal.toFixed(1), precioUnitario.toFixed(0), // Prec. Unit. sin decimales
            formatCurrency(totalPrice), // Prec. Total
            ""
          ]);

          rowIndex++;
        }
      }

      if (sectionValid) {
        rows.push(...sectionRows);
        rowIndex++;
      } else {
        rowIndex -= sectionRows.length;
      }
    }
  }

  return { rows, rowIndex };
};

// Función para formatear el RUT ingresado
export const formatRUT = (rut) => {
  rut = rut.replace(/[^0-9kK]/g, '').toUpperCase();

  if (rut.length < 2) return rut;

  let dv = rut.slice(-1);
  let body = rut.slice(0, -1);

  body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${body}-${dv}`;
};

// Función para manejar conflictos de nombres al guardar archivos
export const handleNameConflict = async (rut, nombreBase) => {
  let nombre = nombreBase;
  let contador = 1;
  let nombreExistente = true;

  while (nombreExistente) {
    const fileName = `${nombre.replace(/ /g, '_')}_${rut}.xlsx`;
    const storageRef = ref(storage, `inspections/${rut}/files/${fileName}`);

    try {
      // Intentamos obtener la URL de descarga del archivo
      await getDownloadURL(storageRef);
      // Si no arroja error, significa que el archivo ya existe
      nombre = `${nombreBase}(${contador})`; // Incrementa el sufijo
      contador++;
    } catch (error) {
      // Si arroja un error, significa que el archivo no existe
      nombreExistente = false;
    }
  }

  return nombre;
};

// Función para resetear la aplicación después de generar el Excel
export const resetApp = (setFormData, setSections) => {
  setFormData({
    nombre: '',
    rut: '',
    direccion: '',
    comuna: '',
    catastroDia: '',
    catastroMes: '',
    catastroAno: '',
  });

  setSections([{
    name: '',
    realCounts: {},
    discountRates: {},
    tempData: {},
    confirmationMessage: '',
    selectedCategories: [{ category: 'Área dañada', subcategory: 'Seleccione subcategoría' }],
    measurements: { length: '', width: '', height: '' }
  }]);
};

// Función para formatear fechas
export const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Los meses en JavaScript van de 0 a 11
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};
