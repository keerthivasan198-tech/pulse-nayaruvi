import 'package:firebase_database/firebase_database.dart';
import '../models/models.dart';

class DatabaseService {
  final FirebaseDatabase _db = FirebaseDatabase.instance;

  // Stream all workspaces that contain the user as a member
  Stream<List<Workspace>> streamWorkspaces(String uid) {
    return _db.ref('workspaces').onValue.map((event) {
      final List<Workspace> list = [];
      if (!event.snapshot.exists || event.snapshot.value == null) {
        return list;
      }

      final data = event.snapshot.value;
      if (data is Map) {
        data.forEach((key, val) {
          if (val is Map) {
            final members = val['members'];
            final ownerId = val['ownerId']?.toString() ?? val['createdBy']?.toString();
            // User is member or owner
            if (ownerId == uid || (members is Map && members.containsKey(uid))) {
              list.add(Workspace.fromMap(key.toString(), val));
            }
          }
        });
      }
      return list;
    });
  }

  // Stream projects inside a workspace
  Stream<List<Project>> streamProjects(String workspaceId) {
    return _db.ref('workspaces/$workspaceId/projects').onValue.map((event) {
      final List<Project> list = [];
      if (!event.snapshot.exists || event.snapshot.value == null) {
        return list;
      }

      final data = event.snapshot.value;
      if (data is Map) {
        data.forEach((key, val) {
          if (val is Map) {
            list.add(Project.fromMap(key.toString(), workspaceId, val));
          }
        });
      }
      return list;
    });
  }

  // Stream tasks for a specific project
  Stream<List<TaskItem>> streamTasks(String workspaceId, String projectId) {
    return _db.ref('workspaces/$workspaceId/projects/$projectId/tasks').onValue.map((event) {
      final List<TaskItem> list = [];
      if (!event.snapshot.exists || event.snapshot.value == null) {
        return list;
      }

      final data = event.snapshot.value;
      if (data is Map) {
        data.forEach((key, val) {
          if (val is Map) {
            list.add(TaskItem.fromMap(key.toString(), val));
          }
        });
      }
      return list;
    });
  }

  // Stream checklist for a specific project
  Stream<List<ChecklistItem>> streamChecklist(String workspaceId, String projectId) {
    return _db.ref('workspaces/$workspaceId/projects/$projectId/checklist').onValue.map((event) {
      final List<ChecklistItem> list = [];
      if (!event.snapshot.exists || event.snapshot.value == null) {
        return list;
      }

      final data = event.snapshot.value;
      if (data is Map) {
        data.forEach((key, val) {
          if (val is Map) {
            list.add(ChecklistItem.fromMap(key.toString(), val));
          }
        });
      }

      // Sort by order ascending
      list.sort((a, b) => a.order.compareTo(b.order));
      return list;
    });
  }

  // Add Task
  Future<String?> addTask(String workspaceId, String projectId, TaskItem task) async {
    final ref = _db.ref('workspaces/$workspaceId/projects/$projectId/tasks').push();
    await ref.set(task.toMap());

    // Sync assignee into project members if specified
    if (task.assigneeId.isNotEmpty) {
      try {
        final pmRef = _db.ref('workspaces/$workspaceId/projects/$projectId/members/${task.assigneeId}');
        final pmSnap = await pmRef.get();
        if (!pmSnap.exists) {
          await pmRef.set({
            'uid': task.assigneeId,
            'name': task.assigneeName.isNotEmpty ? task.assigneeName : 'Member',
            'email': task.assigneeEmail,
            'role': 'Member',
            'joinedAt': DateTime.now().toIso8601String(),
          });
        }
      } catch (e) {
        // non-blocking
      }
    }
    return ref.key;
  }

  // Update Task
  Future<void> updateTask(
    String workspaceId,
    String projectId,
    String taskId,
    Map<String, dynamic> updates,
  ) async {
    final syncUpdates = Map<String, dynamic>.from(updates);
    if (syncUpdates.containsKey('status') && !syncUpdates.containsKey('columnId')) {
      syncUpdates['columnId'] = syncUpdates['status'];
    } else if (syncUpdates.containsKey('columnId') && !syncUpdates.containsKey('status')) {
      syncUpdates['status'] = syncUpdates['columnId'];
    }
    await _db.ref('workspaces/$workspaceId/projects/$projectId/tasks/$taskId').update(syncUpdates);
  }

  // Delete Task
  Future<void> deleteTask(String workspaceId, String projectId, String taskId) async {
    await _db.ref('workspaces/$workspaceId/projects/$projectId/tasks/$taskId').remove();
  }

  // Stream activities / announcements
  Stream<List<ActivityItem>> streamActivities(String workspaceId) {
    return _db.ref('workspaces/$workspaceId/activity').onValue.map((event) {
      final List<ActivityItem> list = [];
      if (!event.snapshot.exists || event.snapshot.value == null) {
        return list;
      }

      final data = event.snapshot.value;
      if (data is Map) {
        data.forEach((key, val) {
          if (val is Map) {
            list.add(ActivityItem.fromMap(key.toString(), val));
          }
        });
      }

      // Sort newest first
      list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      return list;
    });
  }

  // Post Announcement
  Future<void> postAnnouncement(String workspaceId, ActivityItem activity) async {
    final ref = _db.ref('workspaces/$workspaceId/activity').push();
    await ref.set({
      'user': activity.user,
      'action': activity.action,
      'target': activity.target,
      'content': activity.content,
      'type': activity.type,
      'workspaceId': workspaceId,
      'projectId': activity.projectId,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  // Stream members for a project & workspace
  Stream<List<ProjectMember>> streamMembers(String workspaceId, String? projectId) {
    if (projectId == null || projectId.isEmpty) {
      return _db.ref('workspaces/$workspaceId/members').onValue.map((event) {
        final List<ProjectMember> list = [];
        final data = event.snapshot.value;
        if (data is Map) {
          data.forEach((key, val) {
            if (val is Map) {
              list.add(ProjectMember.fromMap(key.toString(), val));
            }
          });
        }
        return list;
      });
    }

    // Merge workspace members with project members
    return _db.ref('workspaces/$workspaceId/members').onValue.asyncMap((wsEvent) async {
      final Map<String, ProjectMember> map = {};
      final wsData = wsEvent.snapshot.value;
      if (wsData is Map) {
        wsData.forEach((k, v) {
          if (v is Map) {
            map[k.toString()] = ProjectMember.fromMap(k.toString(), v);
          }
        });
      }

      final projSnap = await _db.ref('workspaces/$workspaceId/projects/$projectId/members').get();
      if (projSnap.exists && projSnap.value is Map) {
        (projSnap.value as Map).forEach((k, v) {
          if (v is Map) {
            map[k.toString()] = ProjectMember.fromMap(k.toString(), v);
          }
        });
      }

      return map.values.toList();
    });
  }

  // Create a new Workspace
  Future<String?> createWorkspace({
    required String name,
    required String uid,
    required String email,
    required String displayName,
  }) async {
    final ref = _db.ref('workspaces').push();
    final key = ref.key;
    if (key == null) return null;

    final wsData = {
      'id': key,
      '_id': key,
      'name': name.trim(),
      'createdAt': DateTime.now().toIso8601String(),
      'createdBy': uid,
      'ownerId': uid,
      'members': {
        uid: {
          'uid': uid,
          'email': email,
          'name': displayName.isNotEmpty ? displayName : (email.isNotEmpty ? email.split('@')[0] : 'User'),
          'role': 'Owner',
        }
      }
    };
    await ref.set(wsData);
    await _db.ref('user_workspaces/$uid/$key').set({
      'workspaceId': key,
      'name': name.trim(),
      'joinedAt': DateTime.now().toIso8601String(),
    });
    return key;
  }

  // Create a new Project in Workspace (strictly Workspace Owner only)
  Future<String?> createProject({
    required String workspaceId,
    required String title,
    required String uid,
    required String email,
    required String displayName,
    String status = 'Active',
    String category = 'General',
  }) async {
    final wsSnap = await _db.ref('workspaces/$workspaceId').get();
    if (!wsSnap.exists) {
      throw Exception('Workspace not found');
    }
    final wsData = wsSnap.value;
    if (wsData is! Map) {
      throw Exception('Invalid workspace data');
    }
    final ownerId = wsData['ownerId']?.toString() ?? wsData['createdBy']?.toString();
    final members = wsData['members'];
    bool isOwner = ownerId == uid;
    if (!isOwner && members is Map && members.containsKey(uid)) {
      final role = members[uid]?['role']?.toString().toLowerCase();
      if (role == 'owner' || role == 'founder') {
        isOwner = true;
      }
    }
    if (!isOwner) {
      throw Exception('Permission denied: Only the workspace owner can create projects in this workspace.');
    }

    final projRef = _db.ref('workspaces/$workspaceId/projects').push();
    final pKey = projRef.key;
    if (pKey == null) return null;

    final projData = {
      'id': pKey,
      '_id': pKey,
      'title': title.trim(),
      'status': status,
      'category': category,
      'workspaceId': workspaceId,
      'createdBy': uid,
      'ownerId': uid,
      'createdAt': DateTime.now().toIso8601String(),
      'members': {
        uid: {
          'uid': uid,
          'email': email,
          'name': displayName.isNotEmpty ? displayName : (email.isNotEmpty ? email.split('@')[0] : 'User'),
          'role': 'Founder',
          'joinedAt': DateTime.now().toIso8601String(),
        }
      }
    };
    await projRef.set(projData);
    return pKey;
  }

  // Stream In-App Notifications for a user
  Stream<List<AppNotification>> streamNotifications(String uid) {
    if (uid.isEmpty) {
      return Stream.value([]);
    }
    return _db.ref('notifications/$uid').onValue.map((event) {
      final List<AppNotification> list = [];
      final data = event.snapshot.value;
      if (data is Map) {
        data.forEach((k, v) {
          if (v is Map) {
            list.add(AppNotification.fromMap(k.toString(), v));
          }
        });
      }
      // Sort newest first
      list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      return list;
    });
  }

  // Mark single notification read
  Future<void> markNotificationRead(String uid, String notifId) async {
    if (uid.isEmpty || notifId.isEmpty) return;
    try {
      await _db.ref('notifications/$uid/$notifId').update({'read': true});
    } catch (_) {}
  }

  // Delete notification (so once seen, it disappears immediately)
  Future<void> deleteNotification(String uid, String notifId) async {
    if (uid.isEmpty || notifId.isEmpty) return;
    try {
      await _db.ref('notifications/$uid/$notifId').remove();
    } catch (_) {}
  }

  // Mark all notifications read
  Future<void> markAllNotificationsRead(String uid) async {
    if (uid.isEmpty) return;
    try {
      final snap = await _db.ref('notifications/$uid').get();
      if (snap.exists && snap.value is Map) {
        final updates = <String, dynamic>{};
        (snap.value as Map).forEach((k, v) {
          updates['$k/read'] = true;
        });
        await _db.ref('notifications/$uid').update(updates);
      }
    } catch (_) {}
  }

  // Clear all notifications
  Future<void> clearAllNotifications(String uid) async {
    if (uid.isEmpty) return;
    try {
      await _db.ref('notifications/$uid').remove();
    } catch (_) {}
  }

  // Create In-App Notification
  Future<void> sendInAppNotification(String targetUid, AppNotification notif) async {
    if (targetUid.isEmpty) return;
    try {
      final ref = _db.ref('notifications/$targetUid').push();
      await ref.set(notif.toMap());
    } catch (_) {}
  }
}
