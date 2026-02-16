// ============================================
// SILVIA CRM — Firebase Configuration
// File condiviso da tutti i moduli
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, doc, setDoc, getDocs, addDoc, 
  updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, 
  serverTimestamp, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAuYeUI9sNaoXpQCkN_XrXOF34VGWN7oTI",
  authDomain: "silvia-crm-ce19b.firebaseapp.com",
  projectId: "silvia-crm-ce19b",
  storageBucket: "silvia-crm-ce19b.firebasestorage.app",
  messagingSenderId: "1041049614523",
  appId: "1:1041049614523:web:250bd3bc60ffbcfe32119e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
  db, 
  collection, doc, setDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp 
};
