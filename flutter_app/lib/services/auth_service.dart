import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import '../models/models.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseDatabase _rtdb = FirebaseDatabase.instance;

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
    await _auth.signOut();
  }
}
