import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Nayaruvi Pulse Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.windows:
        return windows;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAOfHh7O_IddxXKbNs18zqdDj6wVoHpnZE',
    appId: '1:346073671129:web:40a4a22b56cd08f1f6e5c8',
    messagingSenderId: '346073671129',
    projectId: 'pulsenayaruvi',
    authDomain: 'pulsenayaruvi.firebaseapp.com',
    databaseURL: 'https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'pulsenayaruvi.firebasestorage.app',
    measurementId: 'G-CD8SFWMWMM',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAOfHh7O_IddxXKbNs18zqdDj6wVoHpnZE',
    appId: '1:346073671129:web:40a4a22b56cd08f1f6e5c8',
    messagingSenderId: '346073671129',
    projectId: 'pulsenayaruvi',
    authDomain: 'pulsenayaruvi.firebaseapp.com',
    databaseURL: 'https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'pulsenayaruvi.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAOfHh7O_IddxXKbNs18zqdDj6wVoHpnZE',
    appId: '1:346073671129:ios:40a4a22b56cd08f1f6e5c8',
    messagingSenderId: '346073671129',
    projectId: 'pulsenayaruvi',
    databaseURL: 'https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'pulsenayaruvi.firebasestorage.app',
    iosBundleId: 'com.nayaruvi.flutterPulse',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyAOfHh7O_IddxXKbNs18zqdDj6wVoHpnZE',
    appId: '1:346073671129:web:40a4a22b56cd08f1f6e5c8',
    messagingSenderId: '346073671129',
    projectId: 'pulsenayaruvi',
    authDomain: 'pulsenayaruvi.firebaseapp.com',
    databaseURL: 'https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'pulsenayaruvi.firebasestorage.app',
  );
}
