class PulseUser {
  final String uid;
  final String email;
  final String displayName;
  final String bio;
  final String avatar;
  final String role;

  PulseUser({
    required this.uid,
    required this.email,
    required this.displayName,
    this.bio = '',
    this.avatar = '',
    this.role = 'Member',
  });

  factory PulseUser.fromMap(String uid, Map<dynamic, dynamic>? data) {
    if (data == null) {
      return PulseUser(uid: uid, email: '', displayName: 'User');
    }
    return PulseUser(
      uid: uid,
      email: data['email']?.toString() ?? '',
      displayName: data['name']?.toString() ??
          data['displayName']?.toString() ??
          data['email']?.toString().split('@').first ??
          'User',
      bio: data['bio']?.toString() ?? '',
      avatar: data['avatar']?.toString() ?? data['photoURL']?.toString() ?? '',
      role: data['role']?.toString() ?? 'Member',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'name': displayName,
      'displayName': displayName,
      'bio': bio,
      'avatar': avatar,
      'role': role,
      'updatedAt': DateTime.now().toIso8601String(),
    };
  }
}

class Workspace {
  final String id;
  final String name;
  final String ownerId;
  final String createdBy;
  final Map<String, dynamic> members;

  Workspace({
    required this.id,
    required this.name,
    this.ownerId = '',
    this.createdBy = '',
    this.members = const {},
  });

  factory Workspace.fromMap(String id, Map<dynamic, dynamic>? data) {
    if (data == null) return Workspace(id: id, name: 'Workspace');
    final oId = data['ownerId']?.toString() ?? data['createdBy']?.toString() ?? '';
    final cBy = data['createdBy']?.toString() ?? oId;
    return Workspace(
      id: id,
      name: data['name']?.toString() ?? 'Workspace',
      ownerId: oId,
      createdBy: cBy,
      members: data['members'] is Map ? Map<String, dynamic>.from(data['members']) : {},
    );
  }

  bool isOwner(String uid) {
    if (uid.isEmpty) return false;
    if (ownerId == uid || createdBy == uid) return true;
    if (members.containsKey(uid)) {
      final m = members[uid];
      if (m is Map) {
        final role = m['role']?.toString().toLowerCase();
        if (role == 'owner' || role == 'founder') return true;
      }
    }
    return false;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Workspace && other.id == id);

  @override
  int get hashCode => id.hashCode;
}

class Project {
  final String id;
  final String workspaceId;
  final String title;
  final String description;
  final Map<String, dynamic> members;
  final Map<dynamic, dynamic>? rawTasks;
  final Map<dynamic, dynamic>? rawChecklist;
  final Map<dynamic, dynamic>? rawActivity;

  Project({
    required this.id,
    required this.workspaceId,
    required this.title,
    this.description = '',
    this.members = const {},
    this.rawTasks,
    this.rawChecklist,
    this.rawActivity,
  });

  factory Project.fromMap(String id, String wsId, Map<dynamic, dynamic>? data) {
    if (data == null) return Project(id: id, workspaceId: wsId, title: 'Project');
    return Project(
      id: id,
      workspaceId: wsId,
      title: data['title']?.toString() ?? 'Project',
      description: data['description']?.toString() ?? '',
      members: data['members'] is Map ? Map<String, dynamic>.from(data['members']) : {},
      rawTasks: data['tasks'] is Map ? data['tasks'] as Map : null,
      rawChecklist: data['checklist'] is Map ? data['checklist'] as Map : null,
      rawActivity: data['activity'] is Map ? data['activity'] as Map : null,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Project && other.id == id);

  @override
  int get hashCode => id.hashCode;
}

class TaskItem {
  final String id;
  final String content;
  final String columnId;
  final String priority;
  final String dueDate;
  final String assigneeId;
  final String assigneeName;
  final String assigneeEmail;
  final String creatorId;
  final String creatorName;
  final String creatorEmail;
  final String assignedByName;
  final String assignedByEmail;
  final String createdAt;

  TaskItem({
    required this.id,
    required this.content,
    this.columnId = 'col-todo',
    this.priority = 'medium',
    this.dueDate = '',
    this.assigneeId = '',
    this.assigneeName = '',
    this.assigneeEmail = '',
    this.creatorId = '',
    this.creatorName = '',
    this.creatorEmail = '',
    this.assignedByName = '',
    this.assignedByEmail = '',
    this.createdAt = '',
  });

  factory TaskItem.fromMap(String id, Map<dynamic, dynamic>? data) {
    if (data == null) return TaskItem(id: id, content: '');

    // Synchronize both status and columnId fields from database
    final rawCol = data['status']?.toString() ?? data['columnId']?.toString() ?? 'col-todo';
    String col = rawCol;
    final lower = rawCol.toLowerCase().trim();
    if (lower == 'col-todo' || lower == 'to do' || lower == 'todo') {
      col = 'col-todo';
    } else if (lower == 'col-progress' || lower == 'in progress' || lower == 'progress' || lower == 'doing') {
      col = 'col-progress';
    } else if (lower == 'col-review' || lower == 'review' || lower == 'under review') {
      col = 'col-review';
    } else if (lower == 'col-completed' || lower == 'completed' || lower == 'done' || lower == 'col-complete') {
      col = 'col-completed';
    }

    return TaskItem(
      id: id,
      content: data['content']?.toString() ?? '',
      columnId: col,
      priority: data['priority']?.toString() ?? 'medium',
      dueDate: data['dueDate']?.toString() ?? '',
      assigneeId: data['assigneeId']?.toString() ?? data['assignee']?.toString() ?? '',
      assigneeName: data['assigneeName']?.toString() ?? '',
      assigneeEmail: data['assigneeEmail']?.toString() ?? '',
      creatorId: data['creatorId']?.toString() ?? '',
      creatorName: data['creatorName']?.toString() ?? '',
      creatorEmail: data['creatorEmail']?.toString() ?? '',
      assignedByName: data['assignedByName']?.toString() ?? data['assignedBy']?.toString() ?? '',
      assignedByEmail: data['assignedByEmail']?.toString() ?? '',
      createdAt: data['createdAt']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'content': content,
      'status': columnId,
      'columnId': columnId,
      'priority': priority,
      'dueDate': dueDate,
      'assigneeId': assigneeId,
      'assigneeName': assigneeName,
      'assigneeEmail': assigneeEmail,
      'creatorId': creatorId,
      'creatorName': creatorName,
      'creatorEmail': creatorEmail,
      'assignedByName': assignedByName,
      'assignedByEmail': assignedByEmail,
      'createdAt': createdAt.isNotEmpty ? createdAt : DateTime.now().toIso8601String(),
    };
  }
}

class ActivityItem {
  final String id;
  final String user;
  final String action;
  final String target;
  final String content;
  final String type;
  final String workspaceId;
  final String? projectId;
  final String timestamp;

  ActivityItem({
    required this.id,
    required this.user,
    required this.action,
    required this.target,
    this.content = '',
    this.type = 'announcement',
    required this.workspaceId,
    this.projectId,
    required this.timestamp,
  });

  factory ActivityItem.fromMap(String id, Map<dynamic, dynamic>? data) {
    if (data == null) {
      return ActivityItem(
        id: id,
        user: 'User',
        action: '',
        target: '',
        workspaceId: '',
        timestamp: DateTime.now().toIso8601String(),
      );
    }
    return ActivityItem(
      id: id,
      user: data['user']?.toString() ?? 'User',
      action: data['action']?.toString() ?? '',
      target: data['target']?.toString() ?? '',
      content: data['content']?.toString() ?? '',
      type: data['type']?.toString() ?? 'activity',
      workspaceId: data['workspaceId']?.toString() ?? '',
      projectId: data['projectId']?.toString(),
      timestamp: data['timestamp']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }
}

class ProjectMember {
  final String uid;
  final String email;
  final String name;
  final String role;
  final String avatar;

  ProjectMember({
    required this.uid,
    required this.email,
    required this.name,
    this.role = 'Member',
    this.avatar = '',
  });

  factory ProjectMember.fromMap(String uid, Map<dynamic, dynamic>? data) {
    if (data == null) return ProjectMember(uid: uid, email: '', name: 'Member');
    return ProjectMember(
      uid: uid,
      email: data['email']?.toString() ?? '',
      name: data['name']?.toString() ?? data['email']?.toString().split('@').first ?? 'Member',
      role: data['role']?.toString() ?? 'Member',
      avatar: data['avatar']?.toString() ?? '',
    );
  }
}

class ChecklistItem {
  final String id;
  final String text;
  final bool completed;
  final int order;
  final String createdAt;
  final String taskId;
  final String taskTitle;
  final String assigneeId;
  final String assigneeName;
  final String assigneeEmail;
  final bool isCommon;

  ChecklistItem({
    required this.id,
    required this.text,
    this.completed = false,
    this.order = 0,
    this.createdAt = '',
    this.taskId = '',
    this.taskTitle = '',
    this.assigneeId = '',
    this.assigneeName = '',
    this.assigneeEmail = '',
    this.isCommon = true,
  });

  factory ChecklistItem.fromMap(String id, Map<dynamic, dynamic>? data) {
    if (data == null) return ChecklistItem(id: id, text: '');
    final taskId = data['taskId']?.toString() ?? '';
    final assigneeId = data['assigneeId']?.toString() ?? '';
    final isCommonVal = data['isCommon'];
    final bool isCommon = isCommonVal != null
        ? (isCommonVal == true || isCommonVal.toString() == 'true')
        : (taskId.isEmpty && assigneeId.isEmpty);

    return ChecklistItem(
      id: id,
      text: data['text']?.toString() ?? '',
      completed: data['completed'] == true || data['completed']?.toString() == 'true',
      order: int.tryParse(data['order']?.toString() ?? '0') ?? 0,
      createdAt: data['createdAt']?.toString() ?? '',
      taskId: taskId,
      taskTitle: data['taskTitle']?.toString() ?? '',
      assigneeId: assigneeId,
      assigneeName: data['assigneeName']?.toString() ?? '',
      assigneeEmail: data['assigneeEmail']?.toString() ?? '',
      isCommon: isCommon,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'text': text,
      'completed': completed,
      'order': order,
      'createdAt': createdAt.isNotEmpty ? createdAt : DateTime.now().toIso8601String(),
      'taskId': taskId,
      'taskTitle': taskTitle,
      'assigneeId': assigneeId,
      'assigneeName': assigneeName,
      'assigneeEmail': assigneeEmail,
      'isCommon': isCommon,
    };
  }
}


class AppNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final String taskContent;
  final String assignedByName;
  final String projectTitle;
  final String priority;
  final String dueDate;
  final String workspaceId;
  final String projectId;
  final bool read;
  final String timestamp;

  AppNotification({
    required this.id,
    this.type = 'task_assigned',
    required this.title,
    required this.message,
    this.taskContent = '',
    this.assignedByName = '',
    this.projectTitle = '',
    this.priority = 'Normal',
    this.dueDate = '',
    this.workspaceId = '',
    this.projectId = '',
    this.read = false,
    this.timestamp = '',
  });

  factory AppNotification.fromMap(String id, Map<dynamic, dynamic>? data) {
    if (data == null) {
      return AppNotification(id: id, title: 'Notification', message: '');
    }
    return AppNotification(
      id: id,
      type: data['type']?.toString() ?? 'task_assigned',
      title: data['title']?.toString() ?? 'Notification',
      message: data['message']?.toString() ?? '',
      taskContent: data['taskContent']?.toString() ?? '',
      assignedByName: data['assignedByName']?.toString() ?? '',
      projectTitle: data['projectTitle']?.toString() ?? '',
      priority: data['priority']?.toString() ?? 'Normal',
      dueDate: data['dueDate']?.toString() ?? '',
      workspaceId: data['workspaceId']?.toString() ?? '',
      projectId: data['projectId']?.toString() ?? '',
      read: data['read'] == true || data['read']?.toString() == 'true',
      timestamp: data['timestamp']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'title': title,
      'message': message,
      'taskContent': taskContent,
      'assignedByName': assignedByName,
      'projectTitle': projectTitle,
      'priority': priority,
      'dueDate': dueDate,
      'workspaceId': workspaceId,
      'projectId': projectId,
      'read': read,
      'timestamp': timestamp.isNotEmpty ? timestamp : DateTime.now().toIso8601String(),
    };
  }
}
