import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Ordered endpoints: Android emulator loopback, localhost, and Vercel cloud fallback
  static const List<String> _candidateUrls = [
    'http://10.0.2.2:5000/api',
    'http://localhost:5000/api',
    'https://nayaruvi-pulse.vercel.app/api',
  ];

  static Future<http.Response?> _postWithFallback(String path, Map<String, dynamic> body) async {
    for (final base in _candidateUrls) {
      try {
        final res = await http.post(
          Uri.parse('$base$path'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        ).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          return res;
        }
      } catch (_) {
        // Try next candidate
      }
    }
    return null;
  }

  static Future<bool> sendTaskAssignedNotification({
    required String taskContent,
    required String assigneeName,
    required String assigneeEmail,
    required String assignedByName,
    required String projectTitle,
    String assigneeId = '',
    String priority = 'medium',
    String dueDate = '',
    String workspaceId = '',
    String projectId = '',
  }) async {
    try {
      final response = await _postWithFallback(
        '/notify/task-assigned',
        {
          'taskContent': taskContent,
          'assigneeName': assigneeName,
          'assigneeEmail': assigneeEmail,
          'assigneeId': assigneeId,
          'assignedByName': assignedByName,
          'projectTitle': projectTitle,
          'priority': priority,
          'dueDate': dueDate,
          'workspaceId': workspaceId,
          'projectId': projectId,
        },
      );
      if (response != null && response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['emailSent'] == true;
      }
    } catch (e) {
      // Notification dispatch failed silently
    }
    return false;
  }

  static Future<bool> sendTaskStatusNotification({
    required String taskContent,
    required String previousStatus,
    required String newStatus,
    required String updatedByName,
    required String creatorEmail,
    required String creatorName,
    required String projectTitle,
    String workspaceId = '',
    String projectId = '',
  }) async {
    try {
      final response = await _postWithFallback(
        '/notify/task-status',
        {
          'taskContent': taskContent,
          'previousStatus': previousStatus,
          'newStatus': newStatus,
          'updatedByName': updatedByName,
          'creatorEmail': creatorEmail,
          'creatorName': creatorName,
          'projectTitle': projectTitle,
          'workspaceId': workspaceId,
          'projectId': projectId,
        },
      );
      if (response != null && response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['emailSent'] == true;
      }
    } catch (e) {
      // Notification dispatch failed silently
    }
    return false;
  }

  static Future<bool> sendAnnouncementNotification({
    required String announcement,
    required String authorName,
    required String projectTitle,
    required String workspaceName,
    required List<String> recipients,
    String workspaceId = '',
    String? projectId,
  }) async {
    try {
      final response = await _postWithFallback(
        '/notify/announcement',
        {
          'announcement': announcement,
          'authorName': authorName,
          'projectTitle': projectTitle,
          'workspaceName': workspaceName,
          'recipients': recipients,
          'workspaceId': workspaceId,
          'projectId': projectId,
        },
      );
      if (response != null && response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['emailSent'] == true;
      }
    } catch (e) {
      // Notification dispatch failed silently
    }
    return false;
  }

  static Future<Map<String, dynamic>> sendMemberInvite({
    required String email,
    required String role,
    required String workspaceId,
    required String projectId,
    required String inviterName,
    required String projectTitle,
    required String workspaceName,
  }) async {
    try {
      final response = await _postWithFallback(
        '/invite',
        {
          'email': email,
          'role': role,
          'workspaceId': workspaceId,
          'projectId': projectId,
          'inviterName': inviterName,
          'projectTitle': projectTitle,
          'workspaceName': workspaceName,
        },
      );
      if (response != null && response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
    return {'success': false};
  }
}
