// Firebase-Konfiguration für dieses Projekt (jeopardyvonflixo).

// apiKey & co. sind für Web-Apps öffentlich sichtbar, das ist normal und kein Sicherheitsproblem.

const firebaseConfig = {

  apiKey: "AIzaSyCDoZCuIQ-y785px-X-oaMq1SKnaH1WZTk",

  authDomain: "jeopardyvonflixo.firebaseapp.com",

  databaseURL: "https://jeopardyvonflixo-default-rtdb.firebaseio.com",

  projectId: "jeopardyvonflixo",

  storageBucket: "jeopardyvonflixo.firebasestorage.app",

  messagingSenderId: "372958581592",

  appId: "1:372958581592:web:be20f84b139268af5a8b2d",

  measurementId: "G-5CBWM33M5M"

};



firebase.initializeApp(firebaseConfig);

const db = firebase.database();
