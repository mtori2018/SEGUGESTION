// DataContext.js

import React, { createContext, useContext, useState } from 'react';
const ProjectFormContext = createContext();

export const ProjectFormProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    comuna: '',
    catastroDia: '',
    catastroMes: '',
    catastroAno: '',
  });

  return (
    <ProjectFormContext.Provider value={{ formData, setFormData }}>
      {children}
    </ProjectFormContext.Provider>
  );
};

export const useProjectForm = () => {
  return useContext(ProjectFormContext);
};
