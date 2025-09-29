import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Text, TouchableOpacity, Animated, Platform, Alert, Switch, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from './firebase';
import { useProjectForm } from './ProjectFormContext'; // Importa el contexto

const calculateTotal = (unidad, largo, ancho, altura, medida) => {
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

const formatCurrency = (value) => {
  return Math.round(value); // Redondear a números enteros
};

const generateRows = (data, realCounts, measurements, startIndex) => {
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

          sectionRows.push([
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

export default function App() {
  const { formData, setFormData } = useProjectForm(); // Utiliza directamente el contexto
  const [sections, setSections] = useState([{
    name: '',
    realCounts: {},
    discountRates: {},
    tempData: {},
    confirmationMessage: '',
    selectedCategories: [{ category: 'Área dañada', subcategory: 'Seleccione subcategoría' }],
    measurements: { length: '', width: '', height: '' }
  }]);
  
  const [dataJson, setDataJson] = useState({});
  const [showMessage, setShowMessage] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionRef = collection(db, 'Materialidades');
        const snapshot = await getDocs(collectionRef);

        if (snapshot.empty) {
          console.log('No hay documentos en la colección.');
          return;
        }

        const dataObject = {};

        const fetchSubcollections = snapshot.docs.map(async (doc) => {
          const category = doc.id;
          dataObject[category] = {};

          const subcollectionNames = await getSubcollectionNames();

          const subcollectionPromises = subcollectionNames.map(async (subcollectionName) => {
            const subcollectionRef = collection(db, `Materialidades/${category}/${subcollectionName}`);
            const subcollectionSnapshot = await getDocs(subcollectionRef);

            if (!subcollectionSnapshot.empty) {
              dataObject[category][subcollectionName] = {};

              subcollectionSnapshot.docs.forEach((subDoc) => {
                dataObject[category][subcollectionName][subDoc.id] = subDoc.data();
              });
            }
          });

          await Promise.all(subcollectionPromises);
        });

        await Promise.all(fetchSubcollections);

        setDataJson(dataObject);

      } catch (error) {
        console.error("Error al obtener los documentos: ", error);
      }
    };

    const getSubcollectionNames = async () => {
      return [
        'Cielo Losa', 'Cielo Volcanita', 'Cornisas', 'Muro Cerámico', 'Muro Papel',
        'Muro Volcanita', 'Revestimiento Texturado', 'Muro Albañileria',
        'Muro Terciado Ranurado', 'Piso Cerámico', 'Piso Porcelanato', 'Piso Vinilico',
        'Piso Flotante', 'Piso Alfombra', 'Piso Madera', 'Piso Pasto',
        'Guardapolvos', 'Fisuras', 'Artefactos', 'Picado Superficie', 'Techumbre', 'Cielo Madera',
        'Cielo Terciado Ranurado','Cierre Perimental Pandereta','Muro Refrague','Reparación Techumbre','Muro Siding',
        'Cubierta Policarbonato','Cielo Madera Barnizada', 'Marcos Puertas o Ventanas','Aleros',
        'Piso Refrague','Cielo Revestimiento Granulado', 'Piso Batuco','Retiro De Tina',
        'Piso Pastelon','Reja Perimetral Fierro','Porton Madera Estructura Fierro','Deteccion De Fuga De Agua','Sistema Eléctrico'
      ];
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (showMessage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }).start(() => setShowMessage(false));
        }, 2000);
      });
    }
  }, [showMessage]);

  const handleInputChange = (key, value, sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].realCounts[key] = value;
    setSections(newSections);
  };

  const handlePercentageChange = (key, value, sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].realCounts[`${key}.percentage`] = value;
    setSections(newSections);
  };

  const handleMeasurementChange = (key, value, sectionIndex) => {
    if (!isNaN(value)) {
      const newSections = [...sections];
      newSections[sectionIndex].measurements[key] = value;
      setSections(newSections);
    }
  };

  const formatRUT = (rut) => {
    // Eliminar todos los caracteres que no sean dígitos o la letra 'K'
    rut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
    // Si el RUT es menor a 2 dígitos, devolverlo tal cual
    if (rut.length < 2) return rut;
  
    // Separar el dígito verificador
    let dv = rut.slice(-1);
    let body = rut.slice(0, -1);
  
    // Formatear el cuerpo del RUT con puntos cada 3 dígitos
    body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
    return `${body}-${dv}`;
  };
  
  const handleFormChange = (key, value) => {
    if (key === 'rut') {
      // Aplicar el formato RUT
      value = formatRUT(value);
    }
  
    setFormData(prevData => ({
      ...prevData,
      [key]: value.toUpperCase(),
    }));
  };  
  

  const resetInputs = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].realCounts = {};
    newSections[sectionIndex].discountRates = {};
    newSections[sectionIndex].measurements = { length: '', width: '', height: '' };
    setSections(newSections);
  };

  const sendSectionData = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].tempData = {
      ...newSections[sectionIndex].realCounts,
      measurements: { ...newSections[sectionIndex].measurements }
    };
    newSections[sectionIndex].confirmationMessage = `Datos enviados: ${newSections[sectionIndex].selectedCategories.map(sc => sc.subcategory).join(', ')}`;
    setSections(newSections);
  };

  const handleCategoryChange = (itemValue, subcategoryIndex, sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories[subcategoryIndex].category = itemValue;
    newSections[sectionIndex].selectedCategories[subcategoryIndex].subcategory = 'Seleccione subcategoría';
    newSections[sectionIndex].confirmationMessage = '';
    setSections(newSections);
  };

  const handleSubcategoryChange = (itemValue, subcategoryIndex, sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories[subcategoryIndex].subcategory = itemValue;
    newSections[sectionIndex].confirmationMessage = '';
    setSections(newSections);
  };

  const handleSectorNameChange = (text, sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].name = text.toUpperCase();
    setSections(newSections);
  };

  const addSection = () => {
    setSections([...sections, {
      name: '',
      realCounts: {},
      discountRates: {},
      tempData: {},
      confirmationMessage: '',
      selectedCategories: [{ category: 'Área dañada', subcategory: 'Seleccione subcategoría' }],
      measurements: { length: '', width: '', height: '' }
    }]);
    setShowMessage(true);
  };

  const confirmDeleteSection = (sectionIndex) => {
    setSectionToDelete(sectionIndex);
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta sección?",
      [
        { text: "Cancelar", onPress: () => setSectionToDelete(null), style: "cancel" },
        { text: "Eliminar", onPress: () => deleteSection(sectionIndex) }
      ]
    );
  };

  const deleteSection = (sectionIndex) => {
    const newSections = sections.filter((_, index) => index !== sectionIndex);
    setSections(newSections);
    setSectionToDelete(null);
  };

  const confirmDeleteSubcategory = (sectionIndex, subcategoryIndex) => {
    setSubcategoryToDelete({ sectionIndex, subcategoryIndex });
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta subcategoría?",
      [
        { text: "Cancelar", onPress: () => setSubcategoryToDelete(null), style: "cancel" },
        { text: "Eliminar", onPress: () => deleteSubcategory(sectionIndex, subcategoryIndex) }
      ]
    );
  };

  const deleteSubcategory = (sectionIndex, subcategoryIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories = newSections[sectionIndex].selectedCategories.filter((_, index) => index !== subcategoryIndex);
    setSections(newSections);
    setSubcategoryToDelete(null);
  };

  const addSubcategory = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].selectedCategories.push({ category: 'Área dañada', subcategory: 'Seleccione subcategoría' });
    setSections(newSections);
  };

  const generateExcel = async () => {
    sections.forEach((_, sectionIndex) => sendSectionData(sectionIndex));
    setShowConfirmation(true);
  };
  const handleNameConflict = async (rut, nombreBase) => {
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
  const handleConfirm = async () => {
    try {
        setShowConfirmation(false);

        const finalNombre = await handleNameConflict(formData.rut, formData.nombre);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Project Data');

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString();

        const formattedCatastroDate = `${formData.catastroDia.padStart(2, '0')}/${formData.catastroMes.padStart(2, '0')}/${formData.catastroAno}`;

        // Crear el encabezado de la hoja de cálculo
        const header = [
            ["C&C ", "", "", "", "", "", "", "", ""],
            ["Ingeniería y Obras Menores", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["PROYECTO", "", "", "", "", "", "", "", ""],
            ["REPARACIÓN DAÑOS EN VIVIENDA", "", "", "", "", "", "", "", ""],
            ["NOMBRE: " + formData.nombre, "", "", "", "", "", "", ""],
            ["RUT: " + formData.rut, "", "", "", "", "", "", ""],
            ["FECHA SINIESTRO: " + formattedCatastroDate, "", "", "", "", "", ""],
            ["DIRECCION: " + formData.direccion, "", "", "", "", "", ""],
            ["COMUNA: " + formData.comuna, "", "", "", "", "", ""],
            ["DETALLE  DE  PARTIDAS   ITEMIZADAS", "", "", "", "", "", "DETERMINACIÓN DE VALORES"],
            ["TIPO DE PARTIDA (recintos, medida y detalles)", "", "", "", "Unidad", "Cant. Real", "Prec. Unit.", "Prec. Total", "Obs"],
            ["DESCRIPCIÓN", "", "", "", "", "", "", "", ""],
        ];

        // Añadir los encabezados a la hoja de cálculo
        header.forEach((row, rowIndex) => {
            const rowRef = worksheet.addRow(row);
            rowRef.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 9) {
                    cell.border = {
                        top: { style: 'thin', color: { argb: '000000' } },
                        left: { style: 'thin', color: { argb: '000000' } },
                        bottom: { style: 'thin', color: { argb: '000000' } },
                        right: { style: 'thin', color: { argb: '000000' } }
                    };
                    if (rowIndex < 2 || rowIndex === 3 || rowIndex === 4) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: '002060' },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: '00FF00' },
                        };
                    } else {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFFF' },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: '000000' },
                        };
                    }
                }
            });
        });

        // Merge de celdas específicas para ajustar la estructura del encabezado
        worksheet.mergeCells('A1:I1');
        worksheet.mergeCells('A2:I2');
        worksheet.mergeCells('A3:I3');
        worksheet.mergeCells('A4:I4');
        worksheet.mergeCells('A5:I5');
        worksheet.mergeCells('A6:G6');
        worksheet.mergeCells('A7:G7');
        worksheet.mergeCells('A8:G8');
        worksheet.mergeCells('A9:G9');
        worksheet.mergeCells('A10:G10');
        worksheet.mergeCells('A11:F11');
        worksheet.mergeCells('A12:D12');
        worksheet.mergeCells('H6:I6');
        worksheet.mergeCells('H7:I7');
        worksheet.mergeCells('H8:I8');
        worksheet.mergeCells('H9:I9');
        worksheet.mergeCells('H10:I10');

        // Alineación de celdas importantes
        worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };

        // Ajuste de ancho de las columnas
        worksheet.getColumn(1).width = 35;
        worksheet.getColumn(2).width = 5;
        worksheet.getColumn(3).width = 5;
        worksheet.getColumn(4).width = 5;
        worksheet.getColumn(5).width = 5;
        worksheet.getColumn(6).width = 5;
        worksheet.getColumn(7).width = 10;
        worksheet.getColumn(8).width = 10;
        worksheet.getColumn(9).width = 10;

        // Información de la cotización
        worksheet.getCell('H6').value = 'Fecha: ';
        worksheet.getCell('I6').value = formattedDate;
        worksheet.getCell('H7').value = 'Cotización:';
        worksheet.getCell('I7').value = '';

        const cellsWithBorders = ['H6', 'I6', 'H7', 'I7', 'H8', 'I8', 'H9', 'I9', 'H10', 'I10'];
        cellsWithBorders.forEach((cell) => {
            worksheet.getCell(cell).border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
        });

        const applyCurrencyFormat = (cell) => {
            cell.numFmt = '"$"#,##0';
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        };

        let startIndex = header.length;

        let lastSectorRowIndex;

        // Añadir datos de cada sección
        sections.forEach((section, index) => {
            const measurements = section.tempData.measurements || section.measurements;

            const sectionHeader = [
                [`SECTOR: ${section.name || "SECTOR"}`, ` ${measurements.length || ""}`, "x", ` ${measurements.width || ""}`, "x", ` ${measurements.height || ""}`, "", "", ""]
            ];

            const { rows, rowIndex } = generateRows(dataJson, section.tempData, measurements, startIndex + sectionHeader.length);

            const allRows = [...sectionHeader, ...rows];
            allRows.forEach((row, idx) => {
                const rowRef = worksheet.addRow(row);
                rowRef.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    if (colNumber <= 9) {
                        cell.border = {
                            top: { style: 'thin', color: { argb: '000000' } },
                            left: { style: 'thin', color: { argb: '000000' } },
                            bottom: { style: 'thin', color: { argb: '000000' } },
                            right: { style: 'thin', color: { argb: '000000' } }
                        };
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'E8F3D3' },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: '000000' },
                        };

                        if (colNumber === 8) {
                            applyCurrencyFormat(cell); // Formato de moneda en "Prec. Total"
                        }
                        if (colNumber === 7) {
                            cell.numFmt = '#,##0'; // Formato numérico sin decimales en "Prec. Unit."
                        }
                    }
                });
            });

            lastSectorRowIndex = rowIndex;

            worksheet.addRow([]); // Añadir una fila vacía
            startIndex = rowIndex + 1;
        });

        // Añadir la fila de "GENERAL"
        const generalRow = ["GENERAL", "", "", "", "", "", "", "", ""];
        const generalRowRef = worksheet.addRow(generalRow);
        generalRowRef.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= 9) {
                cell.border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '90EE90' },
                };
                cell.font = {
                    bold: true,
                    color: { argb: '000000' },
                };
            }
        });

        const generalStartIndex = generalRowRef.number;
        const generalData = [
            ["     Traslado de Materiales a Obra", "GL", 1, 60000, 60000],
            ["     Traslado de Personal a Obra", "GL", 1, 50000, 50000],
            ["     Retiro de Escombro y Traslado a Botadero", "GL", 1, 60000, 60000],
            ["     Acomodo de Mobiliario", "GL", 1, 55000, 55000],
            ["     Protección de Áreas de Trabajo", "GL", 1, 40000, 40000],
            ["     Aseo Diario y Entrega Final", "GL", 1, 45000, 45000],
        ];

        generalData.forEach((item) => {
            const row = [
                item[0],
                "", "", "", item[1], item[2], item[3],
                item[4],
                "",
            ];
            const rowRef = worksheet.addRow(row);
            rowRef.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 9) {
                    cell.border = {
                        top: { style: 'thin', color: { argb: '000000' } },
                        left: { style: 'thin', color: { argb: '000000' } },
                        bottom: { style: 'thin', color: { argb: '000000' } },
                        right: { style: 'thin', color: { argb: '000000' } }
                    };
                    if (colNumber === 8) {
                        applyCurrencyFormat(cell);
                    }
                }
            });
        });

        worksheet.addRow([]); // Añadir una fila vacía

        const totalGeneralFormula = `SUM(H${generalStartIndex + 1}:H${generalStartIndex + generalData.length})`;

        const totalGeneralRow = worksheet.addRow(["Total General", "", "", "", "", "", "", { formula: totalGeneralFormula }, ""]);
        worksheet.mergeCells(`A${totalGeneralRow.number}:G${totalGeneralRow.number}`);
        worksheet.mergeCells(`H${totalGeneralRow.number}:I${totalGeneralRow.number}`);
        totalGeneralRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        totalGeneralRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        totalGeneralRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.font = {
                name: 'Arial Narrow',
                bold: true,
                color: { argb: '000000' }
            };
            if (colNumber === 8) {
                applyCurrencyFormat(cell);
            }
        });

        // Cálculo del Costo Directo de Obra, ahora incluye sectores y general
        const costoDirectoDeObraFormula = `SUM(H13:H${generalStartIndex + generalData.length})`;
        const costoDirectoDeObraRow = worksheet.addRow(["COSTO DIRECTO DE OBRA", "", "", "", "", "", "", { formula: costoDirectoDeObraFormula }, ""]);
        worksheet.mergeCells(`A${costoDirectoDeObraRow.number}:G${costoDirectoDeObraRow.number}`);
        worksheet.mergeCells(`H${costoDirectoDeObraRow.number}:I${costoDirectoDeObraRow.number}`);
        costoDirectoDeObraRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        costoDirectoDeObraRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        costoDirectoDeObraRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.font = {
                name: 'Arial Narrow',
                bold: true,
                color: { argb: '000000' }
            };
            if (colNumber === 8) {
                applyCurrencyFormat(cell);
            }
        });

        const gastosGeneralesFormula = `H${costoDirectoDeObraRow.number}*0.25`;
        const gastosGeneralesRow = worksheet.addRow(["GASTOS GENERALES Y UTILIDADES 25%", "", "", "", "", "", "", { formula: gastosGeneralesFormula }, ""]);
        worksheet.mergeCells(`A${gastosGeneralesRow.number}:G${gastosGeneralesRow.number}`);
        worksheet.mergeCells(`H${gastosGeneralesRow.number}:I${gastosGeneralesRow.number}`);
        gastosGeneralesRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        gastosGeneralesRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        gastosGeneralesRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.font = {
                name: 'Arial Narrow',
                bold: true,
                color: { argb: '000000' }
            };
            if (colNumber === 8) {
                applyCurrencyFormat(cell);
            }
        });

        const costoNetoFormula = `H${costoDirectoDeObraRow.number}+H${gastosGeneralesRow.number}`;
        const costoNetoRow = worksheet.addRow(["COSTO NETO", "", "", "", "", "", "", { formula: costoNetoFormula }, ""]);
        worksheet.mergeCells(`A${costoNetoRow.number}:G${costoNetoRow.number}`);
        worksheet.mergeCells(`H${costoNetoRow.number}:I${costoNetoRow.number}`);
        costoNetoRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        costoNetoRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        costoNetoRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.font = {
                name: 'Arial Narrow',
                bold: true,
                color: { argb: '000000' }
            };
            if (colNumber === 8) {
                applyCurrencyFormat(cell);
            }
        });

        const ivaFormula = `H${costoNetoRow.number}*0.19`;
        const ivaRow = worksheet.addRow(["IVA 19%", "", "", "", "", "", "", { formula: ivaFormula }, ""]);
        worksheet.mergeCells(`A${ivaRow.number}:G${ivaRow.number}`);
        worksheet.mergeCells(`H${ivaRow.number}:I${ivaRow.number}`);
        ivaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        ivaRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        ivaRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.font = {
                name: 'Arial Narrow',
                bold: true,
                color: { argb: '000000' }
            };
            if (colNumber === 8) {
                applyCurrencyFormat(cell);
            }
        });

        const costoTotalFormula = `H${costoNetoRow.number}+H${ivaRow.number}`;
        const costoTotalRow = worksheet.addRow(["COSTO TOTAL EN $", "", "", "", "", "", "", { formula: costoTotalFormula }, ""]);
        worksheet.mergeCells(`A${costoTotalRow.number}:G${costoTotalRow.number}`);
        worksheet.mergeCells(`H${costoTotalRow.number}:I${costoTotalRow.number}`);
        costoTotalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        costoTotalRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        costoTotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.font = {
                name: 'Arial Narrow',
                bold: true,
                color: { argb: '000000' }
            };
            if (colNumber === 8) {
                applyCurrencyFormat(cell);
            }
        });

        const fileName = `${finalNombre.replace(/ /g, '_')}_${formData.rut}.xlsx`;
        const uri = FileSystem.cacheDirectory + fileName;

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                const currentFont = cell.font || {};
                cell.font = {
                    ...currentFont,
                    name: 'Arial Narrow',
                    bold: true,
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        await FileSystem.writeAsStringAsync(uri, buffer.toString('base64'), {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Compartir el archivo Excel
        await Sharing.shareAsync(uri);

        // Subir el archivo a Firebase Storage
        const storageRef = ref(storage, `inspections/${formData.rut}/files/${fileName}`);
        const response = await fetch(uri);
        const blob = await response.blob();

        await uploadBytes(storageRef, blob);

        // Obtener la URL de descarga del archivo
        const downloadURL = await getDownloadURL(storageRef);

        // Guardar la metadata y datos del formulario en Firestore
        const docRef = doc(db, `inspections/${formData.rut}/files`, fileName);
        await setDoc(docRef, {
            name: fileName,
            url: downloadURL,
            uploadedAt: new Date(),
            description: '', // Puedes agregar un campo para la descripción si es necesario
        });

        // Guardar los datos del formulario en Firestore en un documento aparte
        const formDocRef = doc(db, `inspections/${formData.rut}`);
        await setDoc(formDocRef, {
            ...formData,
            sections: sections.map((section) => ({
                name: section.name,
                selectedCategories: section.selectedCategories,
                measurements: section.measurements,
                realCounts: section.realCounts,
            })),
        });

        // Reiniciar la aplicación después de generar y compartir el archivo Excel
        resetApp();

    } catch (error) {
        console.error("Error al generar o subir el archivo Excel: ", error);
    }
};

  
  const resetApp = () => {
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          value={formData.nombre}
          onChangeText={(text) => handleFormChange('nombre', text)}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          placeholder="RUT"
          value={formData.rut}
          onChangeText={(text) => handleFormChange('rut', text)}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          placeholder="Dirección"
          value={formData.direccion}
          onChangeText={(text) => handleFormChange('direccion', text)}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          placeholder="Comuna"
          value={formData.comuna}
          onChangeText={(text) => handleFormChange('comuna', text)}
          autoCapitalize="characters"
        />
        <View style={styles.dateInputContainer}>
          <TextInput
            style={styles.dateInput}
            placeholder="Día"
            value={formData.catastroDia}
            onChangeText={(text) => handleFormChange('catastroDia', Math.min(parseInt(text.replace(/[^0-9]/g, ''), 10), 31).toString().slice(0, 2))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Mes"
            value={formData.catastroMes}
            onChangeText={(text) => handleFormChange('catastroMes', Math.min(parseInt(text.replace(/[^0-9]/g, ''), 10), 12).toString().slice(0, 2))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Año"
            value={formData.catastroAno}
            onChangeText={(text) => handleFormChange('catastroAno', text.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="numeric"
          />
        </View>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SECTOR {sectionIndex + 1}</Text>
              <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteSection(sectionIndex)}>
                <Text style={styles.deleteButtonText}>Eliminar Sección</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.sectorInput}
              placeholder="Nombre del Sector"
              value={section.name}
              onChangeText={(text) => handleSectorNameChange(text.toUpperCase(), sectionIndex)}
              autoCapitalize="characters"
            />
            <View style={styles.measurementsContainer}>
              <TextInput
                style={styles.measurementInput}
                placeholder="Largo"
                value={section.measurements.length}
                onChangeText={(text) => handleMeasurementChange('length', text, sectionIndex)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.measurementInput}
                placeholder="Ancho"
                value={section.measurements.width}
                onChangeText={(text) => handleMeasurementChange('width', text, sectionIndex)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.measurementInput}
                placeholder="Alto"
                value={section.measurements.height}
                onChangeText={(text) => handleMeasurementChange('height', text, sectionIndex)}
                keyboardType="numeric"
              />
            </View>
            {section.selectedCategories.map((selectedCategory, subcategoryIndex) => (
              <View key={subcategoryIndex}>
                <Picker
                  selectedValue={selectedCategory.category}
                  style={styles.picker}
                  onValueChange={(itemValue) => handleCategoryChange(itemValue, subcategoryIndex, sectionIndex)}
                >
                  <Picker.Item label="Área dañada" value="Área dañada" />
                  {Object.keys(dataJson).map((categoryKey) => (
                    <Picker.Item key={categoryKey} label={categoryKey.toUpperCase()} value={categoryKey} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={selectedCategory.subcategory}
                  style={styles.picker}
                  onValueChange={(itemValue) => handleSubcategoryChange(itemValue, subcategoryIndex, sectionIndex)}
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
                            onValueChange={(value) => handleInputChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.unidad`, value ? "1" : "0", sectionIndex)}
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
        onChangeText={(text) => handleInputChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.precioManual`, text, sectionIndex)}
      />
    ) : (
      <TextInput
        style={styles.input}
        placeholder="Ingrese cantidad de puntos eléctricos"
        keyboardType="numeric"
        value={section.realCounts[`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.cantidadPuntos`] || ''}
        onChangeText={(text) => handleInputChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.cantidadPuntos`, text, sectionIndex)}
      />
    )}
  </View>
) : (
  <Picker
    selectedValue={section.realCounts[`${selectedCategory.category}.${selectedCategory.subcategory}.${item}.percentage`] || "100"}
    style={styles.picker}
    onValueChange={(itemValue) => handlePercentageChange(`${selectedCategory.category}.${selectedCategory.subcategory}.${item}`, itemValue, sectionIndex)}
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
                  <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteSubcategory(sectionIndex, subcategoryIndex)}>
                    <Text style={styles.deleteButtonText}>Eliminar Subcategoría</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addSubcategoryButton} onPress={() => addSubcategory(sectionIndex)}>
              <Text style={styles.addSubcategoryButtonText}>Añadir Subcategoría</Text>
            </TouchableOpacity>
            {section.confirmationMessage ? (
              <Text style={styles.confirmationMessage}>{section.confirmationMessage}</Text>
            ) : null}
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={addSection}>
          <Text style={styles.addButtonText}>Agregar Sección</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.generateButton} onPress={generateExcel}>
          <Text style={styles.generateButtonText}>Generar Excel</Text>
        </TouchableOpacity>
      </ScrollView>
      {showMessage && (
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.messageText}>Sección agregada</Text>
        </Animated.View>
      )}
      <Modal
  animationType="slide"
  transparent={true}
  visible={showConfirmation}
  onRequestClose={() => setShowConfirmation(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Confirmación</Text>
      <Text style={styles.modalText}>Resumen de Sectores y Subsectores:</Text>
      
      {/* Contenedor con tamaño fijo y scroll */}
      <ScrollView style={styles.scrollViewSummary}>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>{`Sector ${sectionIndex + 1}: ${section.name}`}</Text>
            {section.selectedCategories.map((selectedCategory, subcategoryIndex) => (
              <Text key={subcategoryIndex} style={styles.modalSubcategoryText}>
                {`- ${selectedCategory.category}: ${selectedCategory.subcategory}`}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.modalButtonCancel}
          onPress={() => setShowConfirmation(false)}
        >
          <Text style={styles.modalButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalButtonConfirm}
          onPress={handleConfirm}
        >
          <Text style={styles.modalButtonText}>Confirmar y Generar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </View>
  );
}

// Añade los estilos correspondientes aquí
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    backgroundColor: '#f0f4f7',
  },
  scrollView: {
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  sectionContainer: {
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2980b9',
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
  sectorInput: {
    width: '100%',
    height: 40,
    borderColor: '#dfe6e9',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  scrollViewSummary: {
    maxHeight: 200, // Altura máxima para el scroll
    marginBottom: 20, // Espacio entre el resumen y los botones
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
    borderColor: '#dfe6e9',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 10,
  },
  measurementsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  measurementInput: {
    flex: 1,
    height: 40,
    borderColor: '#dfe6e9',
    borderWidth: 1,
    marginRight: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  subcategoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#2980b9',
  },
  itemContainer: {
    marginBottom: 10,
    backgroundColor: '#ecf0f1',
    padding: 10,
    borderRadius: 8,
  },
  itemHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  addButton: {
    backgroundColor: '#1E90FF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#e67e22',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addSubcategoryButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addSubcategoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateInput: {
    flex: 1,
    height: 40,
    borderColor: '#dfe6e9',
    borderWidth: 1,
    marginHorizontal: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 10,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubcategoryText: {
    fontSize: 16,
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
  modalButtonConfirm: {
    backgroundColor: '#27ae60',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

