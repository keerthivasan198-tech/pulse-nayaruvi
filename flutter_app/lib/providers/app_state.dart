import 'dart:async';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../services/database_service.dart';

class AppState extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final DatabaseService _dbService = DatabaseService();

  PulseUser? _currentUser;
  List<Workspace> _workspaces = [];
  Workspace? _activeWorkspace;
  List<Project> _projects = [];
  Project? _activeProject;
  List<TaskItem> _tasks = [];
  List<ActivityItem> _activities = [];
  List<ProjectMember> _members = [];
  bool _isLoading = false;

  StreamSubscription? _workspaceSub;
  StreamSubscription? _projectSub;
  StreamSubscription? _taskSub;
  StreamSubscription? _activitySub;
  StreamSubscription? _memberSub;

  PulseUser? get currentUser => _currentUser;
  List<Workspace> get workspaces => _workspaces;
  Workspace? get activeWorkspace => _activeWorkspace;
  List<Project> get projects => _projects;
  Project? get activeProject => _activeProject;
  List<TaskItem> get tasks => _tasks;
  List<ActivityItem> get activities => _activities;
  List<ProjectMember> get members => _members;
  bool get isLoading => _isLoading;

  void init(String uid) {
    _isLoading = true;
    notifyListeners();

    _loadProfile(uid);

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

  @override
  void dispose() {
    _workspaceSub?.cancel();
    _projectSub?.cancel();
    _taskSub?.cancel();
    _activitySub?.cancel();
    _memberSub?.cancel();
    super.dispose();
  }
}
