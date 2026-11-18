import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../services/database_service.dart';
import 'add_task_dialog.dart';
import 'task_detail_sheet.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  String _selectedTab = 'all';
  final DatabaseService _dbService = DatabaseService();

  final Map<String, String> _tabs = {
    'all': 'All',
    'col-todo': 'To Do',
    'col-progress': 'In Progress',
    'col-review': 'Review',
    'col-completed': 'Completed',
  };

  Color _getPriorityColor(String p) {
    switch (p) {
      case 'urgent':
        return PulseTheme.priorityUrgent;
      case 'high':
        return PulseTheme.priorityHigh;
      case 'medium':
        return PulseTheme.priorityMedium;
      case 'low':
      default:
        return PulseTheme.priorityLow;
    }
  }

  Future<void> _toggleTaskCompletion(TaskItem task) async {
    final state = Provider.of<AppState>(context, listen: false);
    if (state.activeWorkspace == null || state.activeProject == null) return;

    final isDone = task.columnId == 'col-completed';
    final newStatus = isDone ? 'col-progress' : 'col-completed';

    await _dbService.updateTask(
      state.activeWorkspace!.id,
      state.activeProject!.id,
      task.id,
      {'columnId': newStatus},
    );

    // Notify creator/assignor
    final recipientEmail = task.assignedByEmail.isNotEmpty ? task.assignedByEmail : task.creatorEmail;
    if (recipientEmail.isNotEmpty) {
      ApiService.sendTaskStatusNotification(
        taskContent: task.content,
        previousStatus: task.columnId,
        newStatus: newStatus,
        updatedByName: state.currentUser?.displayName ?? 'Team Member',
        creatorEmail: recipientEmail,
        creatorName: task.assignedByName.isNotEmpty ? task.assignedByName : task.creatorName,
        projectTitle: state.activeProject!.title,
        workspaceId: state.activeWorkspace!.id,
        projectId: state.activeProject!.id,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final tasks = state.tasks;
    final activeProject = state.activeProject;

    if (activeProject == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Select or create a project to view tasks.',
            style: GoogleFonts.plusJakartaSans(color: PulseTheme.textSecondary),
          ),
        ),
      );
    }

    final filteredTasks = _selectedTab == 'all'
        ? tasks
        : tasks.where((t) => t.columnId == _selectedTab).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: _tabs.entries.map((entry) {
                final isSelected = _selectedTab == entry.key;
                final count = entry.key == 'all'
                    ? tasks.length
                    : tasks.where((t) => t.columnId == entry.key).length;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(entry.value),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isSelected ? PulseTheme.accent : PulseTheme.border,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$count',
                            style: GoogleFonts.outfit(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? PulseTheme.primary : PulseTheme.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    selected: isSelected,
                    selectedColor: PulseTheme.primary,
                    backgroundColor: PulseTheme.surface,
                    labelStyle: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? PulseTheme.accent : PulseTheme.textPrimary,
                    ),
                    side: BorderSide(
                      color: isSelected ? PulseTheme.primary : PulseTheme.border,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onSelected: (val) {
                      if (val) setState(() => _selectedTab = entry.key);
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          // Task List
          Expanded(
            child: filteredTasks.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_outlined, size: 48, color: PulseTheme.textMuted),
                          const SizedBox(height: 12),
                          Text(
                            'No tasks in this column yet',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: PulseTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Tap the button below to add a new task',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              color: PulseTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 80),
                    itemCount: filteredTasks.length,
                    itemBuilder: (context, index) {
                      final task = filteredTasks[index];
                      final isDone = task.columnId == 'col-completed';
                      final pColor = _getPriorityColor(task.priority);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: PulseTheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: PulseTheme.border),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              shape: const RoundedRectangleBorder(
                                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                              ),
                              builder: (ctx) => TaskDetailSheet(task: task),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    GestureDetector(
                                      onTap: () => _toggleTaskCompletion(task),
                                      child: Container(
                                        width: 22,
                                        height: 22,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: isDone ? PulseTheme.colCompleted : Colors.transparent,
                                          border: Border.all(
                                            color: isDone ? PulseTheme.colCompleted : PulseTheme.border,
                                            width: 2,
                                          ),
                                        ),
                                        child: isDone
                                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                                            : null,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        task.content,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          decoration: isDone ? TextDecoration.lineThrough : null,
                                          color: isDone ? PulseTheme.textMuted : PulseTheme.textPrimary,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: pColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        task.priority.toUpperCase(),
                                        style: GoogleFonts.outfit(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: pColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    if (task.assigneeName.isNotEmpty) ...[
                                      CircleAvatar(
                                        radius: 10,
                                        backgroundColor: PulseTheme.primary,
                                        child: Text(
                                          task.assigneeName.substring(0, 1).toUpperCase(),
                                          style: GoogleFonts.outfit(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: PulseTheme.accent,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        task.assigneeName,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 11,
                                          color: PulseTheme.textSecondary,
                                        ),
                                      ),
                                      const Spacer(),
                                    ],
                                    if (task.dueDate.isNotEmpty) ...[
                                      const Icon(Icons.calendar_today, size: 12, color: PulseTheme.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        task.dueDate,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 11,
                                          color: PulseTheme.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: PulseTheme.primary,
        foregroundColor: PulseTheme.accent,
        elevation: 2,
        onPressed: () {
          showDialog(
            context: context,
            builder: (ctx) => const AddTaskDialog(),
          );
        },
        icon: const Icon(Icons.add),
        label: Text(
          'New Task',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
