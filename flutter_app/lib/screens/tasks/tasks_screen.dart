import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../providers/app_state.dart';
import 'task_detail_sheet.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  String _selectedTab = 'all';

  final Map<String, String> _tabs = {
    'all': 'All',
    'col-todo': 'To Do',
    'col-progress': 'In Progress',
    'col-review': 'Review',
    'col-completed': 'Completed',
  };

  Color _getPriorityColor(String p) {
    switch (p.toLowerCase()) {
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

  Color _getStatusColor(String colId) {
    switch (colId) {
      case 'col-completed':
        return PulseTheme.colCompleted;
      case 'col-progress':
        return PulseTheme.colProgress;
      case 'col-review':
        return PulseTheme.colReview;
      case 'col-todo':
      default:
        return PulseTheme.colTodo;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final myTasks = state.myTasks;
    final activeProject = state.activeProject;

    if (activeProject == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.folder_open_outlined, size: 48, color: PulseTheme.textMuted),
              const SizedBox(height: 12),
              Text(
                'No Project Selected',
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: PulseTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Select a project from the top bar to view assigned tasks.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  color: PulseTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final filteredTasks = _selectedTab == 'all'
        ? myTasks
        : myTasks.where((t) => t.columnId == _selectedTab).toList();

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
                    ? myTasks.length
                    : myTasks.where((t) => t.columnId == entry.key).length;

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

          // Task List (Assigned to Me)
          Expanded(
            child: filteredTasks.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_turned_in_outlined, size: 48, color: PulseTheme.textMuted),
                          const SizedBox(height: 12),
                          Text(
                            _selectedTab == 'all'
                                ? 'No tasks assigned to you'
                                : 'No assigned tasks in this column',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: PulseTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Tasks assigned to your account in this project will appear here.',
                            textAlign: TextAlign.center,
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
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 20),
                    itemCount: filteredTasks.length,
                    itemBuilder: (context, index) {
                      final task = filteredTasks[index];
                      final isDone = task.columnId == 'col-completed';
                      final pColor = _getPriorityColor(task.priority);
                      final statusColor = _getStatusColor(task.columnId);
                      final statusName = _tabs[task.columnId] ?? 'To Do';

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
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      margin: const EdgeInsets.only(top: 2),
                                      width: 20,
                                      height: 20,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: isDone ? PulseTheme.colCompleted : Colors.transparent,
                                        border: Border.all(
                                          color: isDone ? PulseTheme.colCompleted : PulseTheme.border,
                                          width: 2,
                                        ),
                                      ),
                                      child: isDone
                                          ? const Icon(Icons.check, size: 12, color: Colors.white)
                                          : null,
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
                                    const SizedBox(width: 8),
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
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: statusColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        statusName,
                                        style: GoogleFonts.outfit(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: statusColor,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: PulseTheme.primary.withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Container(
                                            width: 5,
                                            height: 5,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF10B981),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            activeProject.title,
                                            style: GoogleFonts.outfit(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: PulseTheme.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Spacer(),
                                    if (task.dueDate.isNotEmpty) ...[
                                      const Icon(Icons.calendar_today, size: 11, color: PulseTheme.textSecondary),
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
    );
  }
}
