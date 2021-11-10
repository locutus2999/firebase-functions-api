/* ==============================
  The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers
  Firebase Admin SDK
  ref: https://firebase.google.com/docs/admin/setup
    - Cloud Firestore
    - Realtime Database
================================= */
const config = require('config')

// Firebase Functions & Admin SDK
const firebase = require('firebase-admin')
firebase.functions = require('firebase-functions')

// Initialize Firebase App
firebase.initializeApp({
  databaseURL: config.firebase.databaseURL,
  serviceAccount: config.serviceAccounts.firebaseAdmin
})

module.exports = firebase
