// ProjectForm.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Animated, 
  Alert, 
  Modal 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useProjectForm } from './DataContext';
import SectionForm from './SectionForm';
import { styles } from './styles';
import { 
  generateRows, 
  formatRUT, 
  resetApp, 
  handleNameConflict, 
  formatCurrency, 
  formatDate 
} from './utils';
import { db, storage } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';

export default function ProjectForm() {
  const { formData, setFormData } = useProjectForm();

  // Estado para manejar las secciones del formulario
  const [sections, setSections] = useState([{
    name: '',
    realCounts: {},
    discountRates: {},
    tempData: {},
    confirmationMessage: '',
    selectedCategories: [{ category: 'Área dañada', subcategory: 'Seleccione subcategoría' }],
    measurements: { length: '', width: '', height: '' } // Medidas iniciales
  }]);

  // Estado para almacenar datos de materialidades desde Firestore
  const [dataJson, setDataJson] = useState({});

  // Estados para manejar mensajes y animaciones
  const [showMessage, setShowMessage] = useState(false);
  const fadeAnim = new Animated.Value(0);

  // Estados para manejar eliminación de secciones y subcategorías
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Función para formatear moneda
  const formatCurrency = (number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(number);
  };

  // Función para generar el resumen detallado con medidas
  const generateDetailedSummary = () => {
    let summary = "Resumen Detallado de Sectores Dañados:\n\n";
    
    sections.forEach((section, index) => {
      summary += `Sector ${index + 1}: ${section.name || 'Sin Nombre'}\n`;

      // Obtener las medidas generales del sector desde tempData si existen
      const measurements = section.tempData?.measurements || section.measurements;
      summary += `Medidas - Largo: ${measurements.length || 'N/A'}, Ancho: ${measurements.width || 'N/A'}, Alto: ${measurements.height || 'N/A'}\n`;

      section.selectedCategories.forEach((selectedCategory) => {
        const category = selectedCategory.category;
        const subcategory = selectedCategory.subcategory;

        summary += `  Subsector: ${category} - ${subcategory}\n`;

        // Si deseas agregar más información sobre subsectores, puedes hacerlo aquí
      });

      summary += '\n';
    });

    return summary;
  };

  // Función para generar el resumen para la interfaz de usuario (si es necesario)
  const generateSummary = () => {
    let summary = "Resumen de Sectores Dañados:\n\n";
    sections.forEach((section, index) => {
      summary += `Sector ${index + 1}: ${section.name || 'Sin Nombre'}\n`;
      section.selectedCategories.forEach((cat) => {
        summary += ` - ${cat.category}: ${cat.subcategory}\n`;
      });
      summary += '\n';
    });
    return summary;
  };

  // Fetch data from Firestore al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionRef = collection(db, 'Materialidades');
        const snapshot = await getDocs(collectionRef);
  
        const dataObject = {};
  
        // Recorre las categorías principales
        const fetchSubcollections = snapshot.docs.map(async (doc) => {
          const category = doc.id;
          dataObject[category] = {};
  
          const subcollectionNames = await getSubcollectionNames();
  
          const subcollectionPromises = subcollectionNames.map(async (subcollectionName) => {
            const subcollectionRef = collection(db, `Materialidades/${category}/${subcollectionName}`);
            const subcollectionSnapshot = await getDocs(subcollectionRef);
  
            if (!subcollectionSnapshot.empty) {
              // Almacenar los documentos en el orden en que Firebase los entrega
              const subcollection = {};
              subcollectionSnapshot.docs.forEach((subDoc) => {
                subcollection[subDoc.id] = subDoc.data();
              });
  
              dataObject[category][subcollectionName] = subcollection;
            }
          });
  
          await Promise.all(subcollectionPromises);
        });
  
        await Promise.all(fetchSubcollections);
  
        setDataJson(dataObject); // Usa el `dataObject` sin invertir
  
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

  // Manejar animaciones de mensajes
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

  // Manejar cambios en los inputs del formulario
  const handleFormChange = (key, value) => {
    if (key === 'rut') {
      value = formatRUT(value);
    }
    setFormData(prevData => ({
      ...prevData,
      [key]: value.toUpperCase(),
    }));
  };

  // Añadir una nueva sección al formulario
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

  // Enviar datos de la sección actual a tempData
  const sendSectionData = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].tempData = {
      ...newSections[sectionIndex].realCounts,
      measurements: { ...newSections[sectionIndex].measurements } // Copiar medidas
    };
    newSections[sectionIndex].confirmationMessage = `Datos enviados: ${newSections[sectionIndex].selectedCategories.map(sc => sc.subcategory).join(', ')}`;
    
    // Log para verificar las medidas
    console.log(`Sección ${sectionIndex + 1} - Medidas:`, newSections[sectionIndex].tempData.measurements);
    
    setSections(newSections);
  };

  // Generar el archivo Excel
  const generateExcel = async () => {
    // Enviar datos de todas las secciones antes de generar el Excel
    sections.forEach((_, sectionIndex) => sendSectionData(sectionIndex));
    setShowConfirmation(true);
  };

  // Confirmar y manejar la generación del Excel
  const handleConfirm = async () => {
    try {
      setShowConfirmation(false);
      const finalNombre = await handleNameConflict(formData.rut, formData.nombre);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Project Data');

      const currentDate = new Date();
      const formattedDate = formatDate(currentDate);

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
        ["SINIESTRO: " + formData.siniestro, "", "", "", "", "", ""],
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

      // Función para aplicar formato de moneda
      const applyCurrencyFormat = (cell) => {
        cell.numFmt = '"$"#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      };

      let startIndex = header.length;
      let lastSectorRowIndex;

      // Añadir datos de cada sección
      sections.forEach((section, index) => {
        const measurements = section.tempData?.measurements || section.measurements;

        // Encabezado de la sección con medidas
        const sectionHeader = [
          [`SECTOR: ${section.name || "SECTOR"}`, ` ${measurements.length || ""}`, "x", ` ${measurements.width || ""}`, "x", ` ${measurements.height || ""}`, "", "", ""]
        ];

        // Generar las filas de la sección usando generateRows (asegúrate de que esta función maneje correctamente las medidas)
        const { rows, rowIndex } = generateRows(dataJson, section.tempData, measurements, startIndex + sectionHeader.length);

        const allRows = [...sectionHeader, ...rows];
        allRows.forEach((row) => {
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
                name: 'Arial Narrow',
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

        worksheet.addRow([]); // Añadir una fila vacía para separación
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
            name: 'Arial Narrow',
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

      // Generar el resumen detallado
      const detailedSummary = generateDetailedSummary();

      // Definir el nombre y la URI del archivo Excel
      const fileName = `${finalNombre.replace(/ /g, '_')}_${formData.rut}.xlsx`;
      const uri = FileSystem.cacheDirectory + fileName;

      // Formatear las fuentes en todas las celdas
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

      // Escribir el buffer del workbook en el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      await FileSystem.writeAsStringAsync(uri, buffer.toString('base64'), {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Subir el archivo a Firebase Storage
      const storageRef = ref(storage, `inspections/${formData.rut}/files/${fileName}`);
      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);

      // Obtener la URL de descarga del archivo
      const downloadURL = await getDownloadURL(storageRef);

      // Guardar la metadata y datos del formulario en Firestore, incluyendo el resumen
      const docRef = doc(db, `inspections/${formData.rut}/files`, fileName);
      await setDoc(docRef, {
        name: fileName,
        url: downloadURL,
        uploadedAt: new Date(),
        description: '',
        summary: detailedSummary, // Añadir el resumen detallado aquí
        formData: { ...formData },
        sections: sections.map((section) => ({
          name: section.name,
          selectedCategories: section.selectedCategories,
          measurements: section.tempData?.measurements || section.measurements, // Usar tempData.measurements si existen
          realCounts: section.realCounts,
        })),
      });

      // Si ya no necesitas guardar el resumen en el documento principal, puedes eliminar este bloque
      /*
      // Guardar los datos del formulario y el resumen detallado en Firestore en un documento aparte
      const formDocRef = doc(db, `inspections`, formData.rut);
      await setDoc(formDocRef, {
        ...formData,
        sections: sections.map((section) => ({
          name: section.name,
          selectedCategories: section.selectedCategories,
          measurements: section.tempData?.measurements || section.measurements, // Usar tempData.measurements si existen
          realCounts: section.realCounts,
        })),
      }, { merge: true });
      */

      // Compartir el archivo Excel después de que se haya subido correctamente
      await Sharing.shareAsync(uri);

      // Reiniciar la aplicación después de generar y compartir el archivo Excel
      resetApp(setFormData, setSections);

    } catch (error) {
      console.error("Error al generar o subir el archivo Excel: ", error);
      Alert.alert('Error', 'Hubo un problema al generar o subir el archivo Excel.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Inputs del Formulario */}
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
          placeholder="Número Siniestro"
          value={formData.siniestro}
          onChangeText={(text) => handleFormChange('siniestro', text)}
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
            onChangeText={(text) => handleFormChange('catastroDia', 
              Math.min(parseInt(text.replace(/[^0-9]/g, ''), 10), 31)
                .toString()
                .slice(0, 2)
            )}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Mes"
            value={formData.catastroMes}
            onChangeText={(text) => handleFormChange('catastroMes', 
              Math.min(parseInt(text.replace(/[^0-9]/g, ''), 10), 12)
                .toString()
                .slice(0, 2)
            )}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Año"
            value={formData.catastroAno}
            onChangeText={(text) => handleFormChange('catastroAno', 
              text.replace(/[^0-9]/g, '').slice(0, 4)
            )}
            keyboardType="numeric"
          />
        </View>

        {/* Renderizar todas las secciones */}
        {sections.map((section, sectionIndex) => (
          <SectionForm
            key={sectionIndex}
            section={section}
            sectionIndex={sectionIndex}
            sections={sections}
            setSections={setSections}
            dataJson={dataJson}
          />
        ))}

        {/* Botones para agregar sección y generar Excel */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={addSection}
        >
          <Text style={styles.addButtonText}>Agregar Sección</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.generateButton} 
          onPress={generateExcel}
        >
          <Text style={styles.generateButtonText}>Generar Excel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Mensaje de sección agregada */}
      {showMessage && (
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.messageText}>Sección agregada</Text>
        </Animated.View>
      )}

      {/* Modal de Confirmación */}
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
            <ScrollView style={styles.scrollViewSummary}>
              {sections.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    {`Sector ${sectionIndex + 1}: ${section.name}`}
                  </Text>
                  {section.selectedCategories.map((selectedCategory, subcategoryIndex) => (
                    <Text key={subcategoryIndex} style={styles.modalSubcategoryText}>
                      {`- ${selectedCategory.category}: ${selectedCategory.subcategory}`}
                    </Text>
                  ))}
                  {/* Mostrar medidas */}
                  {section.measurements && (
                    <Text style={styles.modalMeasureText}>
                      Medidas - Largo: {section.measurements.length || 'N/A'}, Ancho: {section.measurements.width || 'N/A'}, Alto: {section.measurements.height || 'N/A'}
                    </Text>
                  )}
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
