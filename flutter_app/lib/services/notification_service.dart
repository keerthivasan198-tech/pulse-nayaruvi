import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_database/firebase_database.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handles notifications received while app is terminated or in background
  if (kDebugMode) {
    print("Background message received: ${message.messageId}");
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'pulse_tasks_channel',
    'Task Assignments & Updates',
    description: 'Alerts when tasks are assigned to you by teammates',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
    showBadge: true,
  );

  /// Initialize local system notifications and FCM
  Future<void> initialize() async {
    if (_isInitialized) return;

    // 1. Android settings
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // 2. Darwin (iOS) settings
    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (kDebugMode) {
          print('User tapped notification with payload: ${response.payload}');
        }
      },
    );

    // 3. Create high-importance notification channel on Android
    final androidImplementation = _localNotifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidImplementation != null) {
      await androidImplementation.createNotificationChannel(_channel);
      await androidImplementation.requestNotificationsPermission();
    }

    // 4. Configure Firebase Messaging
    try {
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (kDebugMode) {
        print('User granted notification permission: ${settings.authorizationStatus}');
      }

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final notification = message.notification;
        if (notification != null) {
          showOuterAppNotification(
            title: notification.title ?? 'New Task Assigned',
            body: notification.body ?? 'You have a new task waiting.',
            payload: message.data['taskId']?.toString(),
          );
        }
      });
    } catch (e) {
      if (kDebugMode) {
        print('FirebaseMessaging init error (fallback to local notifications): $e');
      }
    }

    _isInitialized = true;
  }

  /// Register current user's device token in Firebase Realtime Database
  Future<void> registerUserDeviceToken(String uid) async {
    if (uid.isEmpty) return;
    try {
      // ignore: deprecated_member_use
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await FirebaseDatabase.instance.ref('users/$uid/fcmToken').set(token);
        if (kDebugMode) {
          print('Registered device FCM token for user $uid: $token');
        }
      }

      // Keep token up-to-date on refresh
      // ignore: deprecated_member_use
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        FirebaseDatabase.instance.ref('users/$uid/fcmToken').set(newToken);
      });
    } catch (e) {
      if (kDebugMode) {
        print('Could not get/register FCM token: $e');
      }
    }
  }

  /// Show native Outer-App System Notification on the device status bar / lock screen
  Future<void> showOuterAppNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    final androidDetails = AndroidNotificationDetails(
      _channel.id,
      _channel.name,
      channelDescription: _channel.description,
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      icon: '@mipmap/ic_launcher',
      styleInformation: BigTextStyleInformation(body),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    final id = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await _localNotifications.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload,
    );
  }
}
