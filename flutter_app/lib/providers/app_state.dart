import 'dart:async';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../services/database_service.dart';
import '../services/notification_service.dart';

class AppState extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final DatabaseService _dbService = DatabaseService();

  PulseUser? _currentUser;
  List<Workspace> _workspaces = [];
  Workspace? _activeWorkspace;
  List<Project> _projects = [];
  Project? _activeProject;
  List<TaskItem> _tasks = [];
  List<ChecklistItem> _checklist = [];
  List<ActivityItem> _activities = [];
  List<ProjectMember> _members = [];
  List<AppNotification> _notifications = [];
  bool _isLoading = false;

  StreamSubscription? _workspaceSub;
  StreamSubscription? _projectSub;
  StreamSubscription? _taskSub;
  StreamSubscription? _checklistSub;
  StreamSubscription? _activitySub;
  StreamSubscription? _memberSub;
  StreamSubscription? _notifSub;

  PulseUser? get currentUser => _currentUser;
  List<Workspace> get workspaces => _workspaces;
  Workspace? get activeWorkspace => _activeWorkspace;
  List<Project> get projects => _projects;
  Project? get activeProject => _activeProject;
  List<TaskItem> get tasks => _tasks;
  List<ChecklistItem> get checklist => _checklist;
  List<ActivityItem> get activities => _activities;
  List<ProjectMember> get members => _members;
  List<AppNotification> get notifications => _notifications;
  int get unreadNotificationCount => _notifications.where((n) => !n.read).length;
  bool get isLoading => _isLoading;

  /// Returns only tasks assigned to the current user
  List<TaskItem> get myTasks {
    if (_currentUser == null) return [];
    final uid = _currentUser!.uid.toLowerCase().trim();
    final email = _currentUser!.email.toLowerCase().trim();
    final name = _currentUser!.displayName.toLowerCase().trim();

    return _tasks.where((t) {
      final aId = t.assigneeId.toLowerCase().trim();
      final aEmail = t.assigneeEmail.toLowerCase().trim();
      final aName = t.assigneeName.toLowerCase().trim();

      if (aId.isNotEmpty && aId == uid) return true;
      if (email.isNotEmpty && aEmail.isNotEmpty && aEmail == email) return true;
      if (name.isNotEmpty && aName.isNotEmpty && aName == name) return true;
      return false;
    }).toList();
  }

  /// Common checklist items seen by all workspace/project members
  List<ChecklistItem> get commonChecklist {
    return _checklist.where((item) {
      return item.isCommon ||
          (item.taskId.isEmpty && item.assigneeId.isEmpty && item.assigneeEmail.isEmpty);
    }).toList();
  }

  /// Task-specific checklist items assigned to the current user alone
  List<ChecklistItem> get myTaskChecklist {
    if (_currentUser == null) return [];
    final uid = _currentUser!.uid.toLowerCase().trim();
    final email = _currentUser!.email.toLowerCase().trim();
    final userTaskIds = myTasks.map((t) => t.id).toSet();

    return _checklist.where((item) {
      // Must not be a common item
      final isCommon = item.isCommon ||
          (item.taskId.isEmpty && item.assigneeId.isEmpty && item.assigneeEmail.isEmpty);
      if (isCommon) return false;

      // Check if assigned to user directly or linked to user's task
      final aId = item.assigneeId.toLowerCase().trim();
      final aEmail = item.assigneeEmail.toLowerCase().trim();

      if (aId.isNotEmpty && aId == uid) return true;
      if (email.isNotEmpty && aEmail.isNotEmpty && aEmail == email) return true;
      if (item.taskId.isNotEmpty && userTaskIds.contains(item.taskId)) return true;

      return false;
    }).toList();
  }

  /// All checklist items visible to the current user (Common + User's Task Checklist)
  List<ChecklistItem> get visibleChecklist {
    final common = commonChecklist;
    final myTaskItems = myTaskChecklist;
    final seenIds = <String>{};
    final List<ChecklistItem> result = [];

    for (final item in [...common, ...myTaskItems]) {
      if (seenIds.add(item.id)) {
        result.add(item);
      }
    }
    result.sort((a, b) => a.order.compareTo(b.order));
    return result;
  }

  /// Checks whether a project has tasks or information for the current user
  bool projectHasInformation(Project proj) {
    if (_currentUser == null) return false;
    final uid = _currentUser!.uid.toLowerCase().trim();
    final email = _currentUser!.email.toLowerCase().trim();
    final name = _currentUser!.displayName.toLowerCase().trim();

    // 1. If it's the active project, use current memory lists
    if (_activeProject?.id == proj.id) {
      final hasAssignedTasks = myTasks.any((t) => t.columnId != 'col-completed');
      final hasAssignedChecklist = myTaskChecklist.any((c) => !c.completed);
      return hasAssignedTasks || hasAssignedChecklist;
    }

    // 2. Check rawTasks inside project
    if (proj.rawTasks != null) {
      for (final val in proj.rawTasks!.values) {
        if (val is Map) {
          final aId = (val['assigneeId'] ?? val['assignee'] ?? '').toString().toLowerCase().trim();
          final aEmail = (val['assigneeEmail'] ?? '').toString().toLowerCase().trim();
          final aName = (val['assigneeName'] ?? '').toString().toLowerCase().trim();
          final colId = (val['columnId'] ?? 'col-todo').toString();

          final isAssigned = (uid.isNotEmpty && aId == uid) ||
              (email.isNotEmpty && aEmail.isNotEmpty && aEmail == email) ||
              (name.isNotEmpty && aName.isNotEmpty && aName == name);

          if (isAssigned && colId != 'col-completed') {
            return true;
          }
        }
      }
    }

    // 3. Check rawChecklist inside project
    if (proj.rawChecklist != null) {
      for (final val in proj.rawChecklist!.values) {
        if (val is Map) {
          final aId = (val['assigneeId'] ?? '').toString().toLowerCase().trim();
          final aEmail = (val['assigneeEmail'] ?? '').toString().toLowerCase().trim();
          final completed = val['completed'] == true;

          final isAssigned = (uid.isNotEmpty && aId == uid) ||
              (email.isNotEmpty && aEmail.isNotEmpty && aEmail == email);

          if (isAssigned && !completed) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /// Returns count of active (uncompleted) tasks assigned to user in the given project
  int projectAssignedTaskCount(Project proj) {
    if (_currentUser == null) return 0;
    final uid = _currentUser!.uid.toLowerCase().trim();
    final email = _currentUser!.email.toLowerCase().trim();
    final name = _currentUser!.displayName.toLowerCase().trim();

    if (_activeProject?.id == proj.id) {
      return myTasks.where((t) => t.columnId != 'col-completed').length;
    }

    int count = 0;
    if (proj.rawTasks != null) {
      for (final val in proj.rawTasks!.values) {
        if (val is Map) {
          final aId = (val['assigneeId'] ?? val['assignee'] ?? '').toString().toLowerCase().trim();
          final aEmail = (val['assigneeEmail'] ?? '').toString().toLowerCase().trim();
          final aName = (val['assigneeName'] ?? '').toString().toLowerCase().trim();
          final colId = (val['columnId'] ?? 'col-todo').toString();

          final isAssigned = (uid.isNotEmpty && aId == uid) ||
              (email.isNotEmpty && aEmail.isNotEmpty && aEmail == email) ||
              (name.isNotEmpty && aName.isNotEmpty && aName == name);

          if (isAssigned && colId != 'col-completed') {
            count++;
          }
        }
      }
    }
    return count;
  }


  void init(String uid) {
    _isLoading = true;
    notifyListeners();

    _loadProfile(uid);

    // Stream User In-App & Outer Device System Notifications
    _notifSub?.cancel();
    bool isInitialLoad = true;
    _notifSub = _dbService.streamNotifications(uid).listen((notifList) {
      if (!isInitialLoad && notifList.isNotEmpty) {
        final latest = notifList.first;
        if (!latest.read) {
          NotificationService().showOuterAppNotification(
            title: latest.title,
            body: latest.message,
            payload: latest.projectId,
          );
        }
      }
      isInitialLoad = false;
      _notifications = notifList;
      notifyListeners();
    });

    _workspaceSub?.cancel();
    _workspaceSub = _dbService.streamWorkspaces(uid).listen((wsList) {
      _workspaces = wsList;
      if (_workspaces.isNotEmpty) {
        if (_activeWorkspace == null || !_workspaces.any((w) => w.id == _activeWorkspace!.id)) {
          _activeWorkspace = _workspaces.first;
        }
        _onActiveWorkspaceChanged();
      } else {
        _activeWorkspace = null;
        _projects = [];
        _activeProject = null;
        _tasks = [];
        _checklist = [];
        _activities = [];
        _members = [];
      }
      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> _loadProfile(String uid) async {
    _currentUser = await _authService.getUserProfile(uid);
    notifyListeners();
  }

  void setActiveWorkspace(Workspace ws) {
    if (_activeWorkspace?.id == ws.id) return;
    _activeWorkspace = ws;
    _onActiveWorkspaceChanged();
    notifyListeners();
  }

  void _onActiveWorkspaceChanged() {
    if (_activeWorkspace == null) return;
    final wsId = _activeWorkspace!.id;

    // Stream Activities
    _activitySub?.cancel();
    _activitySub = _dbService.streamActivities(wsId).listen((actList) {
      _activities = actList;
      notifyListeners();
    });

    // Stream Projects
    _projectSub?.cancel();
    _projectSub = _dbService.streamProjects(wsId).listen((projList) {
      _projects = projList;
      if (_projects.isNotEmpty) {
        if (_activeProject == null || !_projects.any((p) => p.id == _activeProject!.id)) {
          _activeProject = _projects.first;
        }
        _onActiveProjectChanged();
      } else {
        _activeProject = null;
        _tasks = [];
      }
      notifyListeners();
    });
  }

  void setActiveProject(Project proj) {
    if (_activeProject?.id == proj.id) return;
    _activeProject = proj;
    _onActiveProjectChanged();
    notifyListeners();
  }

  void _onActiveProjectChanged() {
    if (_activeWorkspace == null) return;
    final wsId = _activeWorkspace!.id;
    final projId = _activeProject?.id;

    // Stream Tasks
    _taskSub?.cancel();
    if (projId != null) {
      _taskSub = _dbService.streamTasks(wsId, projId).listen((taskList) {
        _tasks = taskList;
        notifyListeners();
      });
    } else {
      _tasks = [];
    }

    // Stream Checklist
    _checklistSub?.cancel();
    if (projId != null) {
      _checklistSub = _dbService.streamChecklist(wsId, projId).listen((checklistItems) {
        _checklist = checklistItems;
        notifyListeners();
      });
    } else {
      _checklist = [];
    }

    // Stream Members
    _memberSub?.cancel();
    _memberSub = _dbService.streamMembers(wsId, projId).listen((memberList) {
      _members = memberList;
      notifyListeners();
    });
  }

  Future<void> updateProfile({
    required String name,
    required String bio,
    String? role,
  }) async {
    if (_currentUser == null) return;
    final updated = PulseUser(
      uid: _currentUser!.uid,
      email: _currentUser!.email,
      displayName: name,
      bio: bio,
      avatar: _currentUser!.avatar,
      role: role ?? _currentUser!.role,
    );
    await _authService.saveUserProfile(updated);
    _currentUser = updated;
    notifyListeners();
  }

  Future<String?> createWorkspace(String name) async {
    final user = _authService.currentUser;
    if (user == null) throw Exception('Must be logged in');
    final wsId = await _dbService.createWorkspace(
      name: name,
      uid: user.uid,
      email: user.email ?? '',
      displayName: _currentUser?.displayName ?? user.displayName ?? '',
    );
    return wsId;
  }

  Future<String?> createProject(String title, {String category = 'General'}) async {
    if (_activeWorkspace == null) throw Exception('No active workspace');
    final user = _authService.currentUser;
    if (user == null) throw Exception('Must be logged in');

    if (!_activeWorkspace!.isOwner(user.uid)) {
      throw Exception('Permission denied: Only Workspace Owner can create projects.');
    }

    final pId = await _dbService.createProject(
      workspaceId: _activeWorkspace!.id,
      title: title,
      uid: user.uid,
      email: user.email ?? '',
      displayName: _currentUser?.displayName ?? user.displayName ?? '',
      category: category,
    );
    return pId;
  }

  Future<void> markNotificationRead(String notifId) async {
    if (_currentUser == null) return;
    await _dbService.markNotificationRead(_currentUser!.uid, notifId);
  }

  /// Dismisses a notification so once seen, it immediately disappears
  Future<void> dismissNotification(String notifId) async {
    if (_currentUser == null) return;
    await _dbService.deleteNotification(_currentUser!.uid, notifId);
  }

  Future<void> markAllNotificationsRead() async {
    if (_currentUser == null) return;
    await _dbService.markAllNotificationsRead(_currentUser!.uid);
  }

  /// Clears all notifications so the page is clean
  Future<void> clearAllNotifications() async {
    if (_currentUser == null) return;
    await _dbService.clearAllNotifications(_currentUser!.uid);
  }

  @override
  void dispose() {
    _workspaceSub?.cancel();
    _projectSub?.cancel();
    _taskSub?.cancel();
    _checklistSub?.cancel();
    _activitySub?.cancel();
    _memberSub?.cancel();
    _notifSub?.cancel();
    super.dispose();
  }
}
