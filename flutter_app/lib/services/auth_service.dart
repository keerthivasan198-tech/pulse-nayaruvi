import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/models.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseDatabase _rtdb = FirebaseDatabase.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  Future<PulseUser?> getCurrentPulseUser() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return getUserProfile(user.uid);
  }

  Future<PulseUser> signIn({
    required String email,
    required String password,
  }) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final uid = cred.user!.uid;
    PulseUser? profile = await getUserProfile(uid);
    if (profile == null) {
      profile = PulseUser(
        uid: uid,
        email: cred.user!.email ?? email,
        displayName: cred.user!.displayName ?? email.split('@').first,
      );
      await saveUserProfile(profile);
    }
    return profile;
  }

  Future<PulseUser?> signInWithGoogle() async {
    UserCredential cred;

    if (kIsWeb) {
      final GoogleAuthProvider googleProvider = GoogleAuthProvider();
      cred = await _auth.signInWithPopup(googleProvider);
    } else {
      try {
        final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
        if (googleUser == null) {
          // User cancelled the sign-in
          return null;
        }
        final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
        final OAuthCredential credential = GoogleAuthProvider.credential(
          accessToken: googleAuth.accessToken,
          idToken: googleAuth.idToken,
        );
        cred = await _auth.signInWithCredential(credential);
      } catch (nativeErr) {
        // Fallback: If native Google Play Services encounters an error,
        // use Firebase Auth's federated browser-based provider flow
        try {
          final GoogleAuthProvider googleProvider = GoogleAuthProvider();
          cred = await _auth.signInWithProvider(googleProvider);
        } catch (_) {
          rethrow;
        }
      }
    }

    final user = cred.user;
    if (user == null) return null;

    PulseUser? profile = await getUserProfile(user.uid);
    if (profile == null) {
      profile = PulseUser(
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? user.email?.split('@').first ?? 'User',
        avatar: user.photoURL ?? '',
        role: 'Member',
      );
      await saveUserProfile(profile);
    } else if (user.photoURL != null && profile.avatar.isEmpty) {
      // Sync avatar if not set
      profile = PulseUser(
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        bio: profile.bio,
        avatar: user.photoURL ?? '',
        role: profile.role,
      );
      await saveUserProfile(profile);
    }

    return profile;
  }

  Future<PulseUser> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final uid = cred.user!.uid;
    await cred.user!.updateDisplayName(name);

    final profile = PulseUser(
      uid: uid,
      email: email.trim(),
      displayName: name.trim(),
      role: 'Member',
    );
    await saveUserProfile(profile);
    return profile;
  }

  Future<PulseUser?> getUserProfile(String uid) async {
    try {
      final snapshot = await _rtdb.ref('users/$uid').get();
      if (snapshot.exists && snapshot.value is Map) {
        return PulseUser.fromMap(uid, snapshot.value as Map);
      }
    } catch (_) {}
    return null;
  }

  Future<void> saveUserProfile(PulseUser user) async {
    try {
      await _rtdb.ref('users/${user.uid}').update(user.toMap());
      if (_auth.currentUser != null && _auth.currentUser!.uid == user.uid) {
        await _auth.currentUser!.updateDisplayName(user.displayName);
      }
    } catch (_) {}
  }

  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    await _auth.signOut();
  }
}
