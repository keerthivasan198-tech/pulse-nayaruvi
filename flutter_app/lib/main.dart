import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'constants/theme.dart';
import 'providers/app_state.dart';
import 'services/notification_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/home_screen.dart';
import 'widgets/splash_intro_overlay.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  await NotificationService().initialize();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const NayaruviPulseApp(),
    ),
  );
}

class NayaruviPulseApp extends StatelessWidget {
  const NayaruviPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nayaruvi Pulse',
      debugShowCheckedModeBanner: false,
      theme: PulseTheme.lightTheme,
      home: const SplashIntroOverlay(
        child: AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? _initializedUid;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            backgroundColor: PulseTheme.background,
            body: Center(
              child: CircularProgressIndicator(color: PulseTheme.primary),
            ),
          );
        }

        final user = snapshot.data;
        if (user == null) {
          _initializedUid = null;
          return const LoginScreen();
        }

        // Initialize state for the authenticated user
        if (_initializedUid != user.uid) {
          _initializedUid = user.uid;
          NotificationService().registerUserDeviceToken(user.uid);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Provider.of<AppState>(context, listen: false).init(user.uid);
          });
        }

        return const HomeScreen();
      },
    );
  }
}
