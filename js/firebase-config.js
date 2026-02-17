// ═══ Firebase Configuration ═══
const firebaseConfig = {
  apiKey: "AIzaSyAuYeUI9sNaoXpQCkN_XrXOF34VGWN7oTI",
  authDomain: "silvia-crm-ce19b.firebaseapp.com",
  projectId: "silvia-crm-ce19b",
  storageBucket: "silvia-crm-ce19b.firebasestorage.app",
  messagingSenderId: "1041049614523",
  appId: "1:1041049614523:web:250bd3bc60ffbcfe32119e"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();
