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
  final Map<String, dynamic> members;

  Workspace({
    required this.id,
    required this.name,
    this.ownerId = '',
    this.members = const {},
  });

  factory Workspace.fromMap(String id, Map<dynamic, dynamic>? data) {
    if (data == null) return Workspace(id: id, name: 'Workspace');
    return Workspace(
      id: id,
      name: data['name']?.toString() ?? 'Workspace',
      ownerId: data['ownerId']?.toString() ?? '',
      members: data['members'] is Map ? Map<String, dynamic>.from(data['members']) : {},
    );
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
    return TaskItem(
      id: id,
      content: data['content']?.toString() ?? '',
      columnId: data['columnId']?.toString() ?? 'col-todo',
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
