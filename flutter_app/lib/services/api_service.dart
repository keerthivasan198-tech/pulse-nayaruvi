import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Live Vercel production API URL with fallback
  static const String baseUrl = 'https://nayaruvi-pulse.vercel.app/api';

  static Future<bool> sendTaskAssignedNotification({
    required String taskContent,
    required String assigneeName,
    required String assigneeEmail,
    required String assignedByName,
    required String projectTitle,
    String priority = 'medium',
    String dueDate = '',
    String workspaceId = '',
    String projectId = '',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/notify/task-assigned'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'taskContent': taskContent,
          'assigneeName': assigneeName,
          'assigneeEmail': assigneeEmail,
          'assignedByName': assignedByName,
          'projectTitle': projectTitle,
          'priority': priority,
          'dueDate': dueDate,
          'workspaceId': workspaceId,
          'projectId': projectId,
        }),
      );
      if (response.statusCode == 200) {
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
      final response = await http.post(
        Uri.parse('$baseUrl/notify/task-status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'taskContent': taskContent,
          'previousStatus': previousStatus,
          'newStatus': newStatus,
          'updatedByName': updatedByName,
          'creatorEmail': creatorEmail,
          'creatorName': creatorName,
          'projectTitle': projectTitle,
          'workspaceId': workspaceId,
          'projectId': projectId,
        }),
      );
      if (response.statusCode == 200) {
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
      final response = await http.post(
        Uri.parse('$baseUrl/notify/announcement'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'announcement': announcement,
          'authorName': authorName,
          'projectTitle': projectTitle,
          'workspaceName': workspaceName,
          'recipients': recipients,
          'workspaceId': workspaceId,
          'projectId': projectId,
        }),
      );
      if (response.statusCode == 200) {
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
      final response = await http.post(
        Uri.parse('$baseUrl/invite'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'role': role,
          'workspaceId': workspaceId,
          'projectId': projectId,
          'inviterName': inviterName,
          'projectTitle': projectTitle,
          'workspaceName': workspaceName,
        }),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
    return {'success': false};
  }
}
