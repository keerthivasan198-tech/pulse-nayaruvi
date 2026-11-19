import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';

class TaskDetailSheet extends StatelessWidget {
  final TaskItem task;

  const TaskDetailSheet({super.key, required this.task});

  static const Map<String, String> _columns = {
    'col-todo': 'To Do',
    'col-progress': 'In Progress',
    'col-review': 'Under Review',
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
    final statusName = _columns[task.columnId] ?? 'To Do';
    final statusColor = _getStatusColor(task.columnId);
    final priorityColor = _getPriorityColor(task.priority);

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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusName,
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          Text(
            task.content,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: PulseTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 20),

          // Priority & Due Date Cards
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: PulseTheme.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: PulseTheme.border),
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
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: priorityColor,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            task.priority.toUpperCase(),
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: priorityColor,
                            ),
                          ),
                        ],
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
                    border: Border.all(color: PulseTheme.border),
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
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 12, color: PulseTheme.textSecondary),
                          const SizedBox(width: 6),
                          Text(
                            task.dueDate.isNotEmpty ? task.dueDate : 'None',
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: PulseTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // People Details (Assigned By & Assigned To)
          if (task.assigneeName.isNotEmpty) ...[
            Text(
              'Assigned To',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: PulseTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: PulseTheme.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: PulseTheme.primary,
                    child: Text(
                      task.assigneeName.isNotEmpty ? task.assigneeName[0].toUpperCase() : 'U',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.accent,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${task.assigneeName} ${task.assigneeEmail.isNotEmpty ? "(${task.assigneeEmail})" : ""}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: PulseTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (task.assignedByName.isNotEmpty || task.creatorName.isNotEmpty) ...[
            Text(
              'Assigned By',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: PulseTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: PulseTheme.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.person_pin_outlined, size: 18, color: PulseTheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      task.assignedByName.isNotEmpty
                          ? '${task.assignedByName} ${task.assignedByEmail.isNotEmpty ? "(${task.assignedByEmail})" : ""}'
                          : '${task.creatorName} ${task.creatorEmail.isNotEmpty ? "(${task.creatorEmail})" : ""}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: PulseTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
