import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../services/database_service.dart';

class TaskDetailSheet extends StatefulWidget {
  final TaskItem task;

  const TaskDetailSheet({super.key, required this.task});

  @override
  State<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends State<TaskDetailSheet> {
  final DatabaseService _dbService = DatabaseService();
  late String _currentStatus;
  bool _isUpdating = false;

  final Map<String, String> _columns = {
    'col-todo': 'To Do',
    'col-progress': 'In Progress',
    'col-review': 'Under Review',
    'col-completed': 'Completed',
  };

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.task.columnId;
  }

  Future<void> _updateStatus(String newStatus) async {
    if (newStatus == _currentStatus) return;
    final state = Provider.of<AppState>(context, listen: false);
    if (state.activeWorkspace == null || state.activeProject == null) return;

    final oldStatus = _currentStatus;
    setState(() {
      _currentStatus = newStatus;
      _isUpdating = true;
    });

    try {
      // 1. Update in RTDB
      await _dbService.updateTask(
        state.activeWorkspace!.id,
        state.activeProject!.id,
        widget.task.id,
        {'columnId': newStatus},
      );

      // 2. Dispatch status update email to the assignor/creator if email exists
      final recipientEmail = widget.task.assignedByEmail.isNotEmpty
          ? widget.task.assignedByEmail
          : widget.task.creatorEmail;

      if (recipientEmail.isNotEmpty) {
        ApiService.sendTaskStatusNotification(
          taskContent: widget.task.content,
          previousStatus: oldStatus,
          newStatus: newStatus,
          updatedByName: state.currentUser?.displayName ?? 'Team Member',
          creatorEmail: recipientEmail,
          creatorName: widget.task.assignedByName.isNotEmpty
              ? widget.task.assignedByName
              : widget.task.creatorName,
          projectTitle: state.activeProject!.title,
          workspaceId: state.activeWorkspace!.id,
          projectId: state.activeProject!.id,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              recipientEmail.isNotEmpty
                  ? 'Status updated to ${_columns[newStatus]} & assignor notified!'
                  : 'Status updated to ${_columns[newStatus]}!',
            ),
            backgroundColor: PulseTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Update failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _deleteTask() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    if (!mounted) return;
    final state = Provider.of<AppState>(context, listen: false);
    if (state.activeWorkspace == null || state.activeProject == null) return;

    await _dbService.deleteTask(
      state.activeWorkspace!.id,
      state.activeProject!.id,
      widget.task.id,
    );

    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: PulseTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Task Details',
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: PulseTheme.textPrimary,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red, size: 22),
                onPressed: _deleteTask,
              ),
            ],
          ),
          const SizedBox(height: 12),

          Text(
            widget.task.content,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: PulseTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 18),

          // Status Dropdown
          Text(
            'Current Status',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: PulseTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            initialValue: _currentStatus,
            decoration: const InputDecoration(),
            items: _columns.entries.map((e) {
              return DropdownMenuItem(
                value: e.key,
                child: Text(e.value),
              );
            }).toList(),
            onChanged: _isUpdating ? null : (v) => v != null ? _updateStatus(v) : null,
          ),
          const SizedBox(height: 16),

          // Priority & Due Date
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: PulseTheme.background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Priority',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          color: PulseTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.task.priority.toUpperCase(),
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: PulseTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: PulseTheme.background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Due Date',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          color: PulseTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.task.dueDate.isNotEmpty ? widget.task.dueDate : 'None',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: PulseTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // People details
          if (widget.task.assigneeName.isNotEmpty) ...[
            Text(
              'Assigned To',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: PulseTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.task.assigneeName} (${widget.task.assigneeEmail})',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: PulseTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (widget.task.assignedByName.isNotEmpty) ...[
            Text(
              'Assigned By',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: PulseTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.task.assignedByName} (${widget.task.assignedByEmail})',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: PulseTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 18),
          ],

          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }
}
