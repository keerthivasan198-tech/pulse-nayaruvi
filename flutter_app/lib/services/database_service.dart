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
            final ownerId = val['ownerId']?.toString();
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
    return ref.key;
  }

  // Update Task
  Future<void> updateTask(
    String workspaceId,
    String projectId,
    String taskId,
    Map<String, dynamic> updates,
  ) async {
    await _db.ref('workspaces/$workspaceId/projects/$projectId/tasks/$taskId').update(updates);
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
    final path = (projectId != null && projectId.isNotEmpty)
        ? 'workspaces/$workspaceId/projects/$projectId/members'
        : 'workspaces/$workspaceId/members';

    return _db.ref(path).onValue.map((event) {
      final List<ProjectMember> list = [];
      if (!event.snapshot.exists || event.snapshot.value == null) {
        return list;
      }

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
}
