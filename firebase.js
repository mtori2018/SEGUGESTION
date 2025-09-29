import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Importa Firebase Storage

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCjp2F9EKMI8fJshF0eVyFgOSyHn8yvAoQ",
  authDomain: "appmovil-9ecae.firebaseapp.com",
  projectId: "appmovil-9ecae",
  storageBucket: "appmovil-9ecae.appspot.com",
  messagingSenderId: "304927404377",
  appId: "1:304927404377:web:b3e538959dfdf7797bdc48",
  measurementId: "G-D5PV8RY1V6"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa servicios específicos
const auth = getAuth(app);
const firestore = getFirestore(app);
const db = getFirestore(app);
const storage = getStorage(app); // Inicializa Firebase Storage

// Exporta auth, firestore, db, y storage para usarlos en otras partes de la app
export { auth, firestore, db, storage };
