import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../services/database_service.dart';

class AddTaskDialog extends StatefulWidget {
  const AddTaskDialog({super.key});

  @override
  State<AddTaskDialog> createState() => _AddTaskDialogState();
}

class _AddTaskDialogState extends State<AddTaskDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final DatabaseService _dbService = DatabaseService();

  String _priority = 'medium';
  String _columnId = 'col-todo';
  DateTime? _dueDate;
  String? _selectedAssigneeUid;
  bool _isSubmitting = false;

  final List<String> _priorities = ['urgent', 'high', 'medium', 'low'];

  final Map<String, String> _columns = {
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

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final state = Provider.of<AppState>(context, listen: false);
    if (state.activeWorkspace == null || state.activeProject == null) return;

    setState(() => _isSubmitting = true);

    try {
      final members = state.members;
      ProjectMember? selectedAssignee;
      if (_selectedAssigneeUid != null && _selectedAssigneeUid!.isNotEmpty) {
        for (final m in members) {
          if (m.uid == _selectedAssigneeUid) {
            selectedAssignee = m;
            break;
          }
        }
      }

      final user = state.currentUser;
      final currentUid = user?.uid ?? '';
      final currentName = (user != null && user.displayName.isNotEmpty)
          ? user.displayName
          : (user?.email ?? 'Team Lead');
      final currentEmail = user?.email ?? '';

      final targetAssigneeName = selectedAssignee != null
          ? (selectedAssignee.name.isNotEmpty ? selectedAssignee.name : selectedAssignee.email)
          : '';

      final task = TaskItem(
        id: '',
        content: _titleController.text.trim(),
        columnId: _columnId,
        priority: _priority,
        dueDate: _dueDate != null ? DateFormat('yyyy-MM-dd').format(_dueDate!) : '',
        assigneeId: selectedAssignee?.uid ?? '',
        assigneeName: targetAssigneeName,
        assigneeEmail: selectedAssignee?.email ?? '',
        creatorId: currentUid,
        creatorName: currentName,
        creatorEmail: currentEmail,
        assignedByName: currentName,
        assignedByEmail: currentEmail,
        createdAt: DateTime.now().toIso8601String(),
      );

      // 1. Add to Firebase RTDB
      await _dbService.addTask(
        state.activeWorkspace!.id,
        state.activeProject!.id,
        task,
      );

      // 2. Send in-app notification to assignee's mobile device
      if (selectedAssignee != null && selectedAssignee.uid.isNotEmpty) {
        await _dbService.sendInAppNotification(
          selectedAssignee.uid,
          AppNotification(
            id: '',
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: '$currentName assigned you: "${task.content}" in ${state.activeProject!.title}',
            taskContent: task.content,
            assignedByName: currentName,
            projectTitle: state.activeProject!.title,
            priority: _priority,
            dueDate: task.dueDate,
            workspaceId: state.activeWorkspace!.id,
            projectId: state.activeProject!.id,
          ),
        );
      }

      // 3. Send email notification if assignee has an email
      if (selectedAssignee != null && selectedAssignee.email.isNotEmpty) {
        ApiService.sendTaskAssignedNotification(
          taskContent: task.content,
          assigneeName: targetAssigneeName,
          assigneeEmail: selectedAssignee.email,
          assigneeId: selectedAssignee.uid,
          assignedByName: currentName,
          projectTitle: state.activeProject!.title,
          priority: _priority,
          dueDate: task.dueDate,
          workspaceId: state.activeWorkspace!.id,
          projectId: state.activeProject!.id,
        );
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              selectedAssignee != null && selectedAssignee.email.isNotEmpty
                  ? 'Task created & emailed to $targetAssigneeName!'
                  : 'Task created successfully!',
            ),
            backgroundColor: PulseTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error adding task: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final members = state.members;

    // Deduplicate members by uid
    final Map<String, ProjectMember> uniqueMap = {};
    for (final m in members) {
      if (m.uid.isNotEmpty) {
        uniqueMap[m.uid] = m;
      }
    }
    final uniqueMembers = uniqueMap.values.toList();

    return Dialog(
      backgroundColor: PulseTheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Create New Task',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Task Title
                Text(
                  'Task Title & Details',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: PulseTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _titleController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'What needs to be done?',
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter task content' : null,
                ),
                const SizedBox(height: 16),

                // Status / Column Selector
                Text(
                  'Status Column',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: PulseTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _columns.entries.map((entry) {
                    final isSelected = _columnId == entry.key;
                    return ChoiceChip(
                      label: Text(
                        entry.value,
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? PulseTheme.accent : PulseTheme.textPrimary,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: PulseTheme.primary,
                      backgroundColor: PulseTheme.background,
                      side: BorderSide(
                        color: isSelected ? PulseTheme.primary : PulseTheme.border,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      onSelected: (val) {
                        if (val) setState(() => _columnId = entry.key);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Priority Selector
                Text(
                  'Priority',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: PulseTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _priorities.map((p) {
                    final isSelected = _priority == p;
                    final color = _getPriorityColor(p);
                    return ChoiceChip(
                      label: Text(
                        p.toUpperCase(),
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : color,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: color,
                      backgroundColor: color.withValues(alpha: 0.1),
                      side: BorderSide(color: color.withValues(alpha: 0.3)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      onSelected: (val) {
                        if (val) setState(() => _priority = p);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Assignee Picker
                Text(
                  'Assignee (Will receive an email notification)',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: PulseTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String?>(
                  initialValue: _selectedAssigneeUid,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.person_outline, size: 20),
                  ),
                  hint: const Text('Select a team member...'),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('Unassigned'),
                    ),
                    ...uniqueMembers.map((m) {
                      final displayName = m.name.isNotEmpty ? m.name : m.email;
                      final roleLabel = m.role.isNotEmpty ? m.role : 'Member';
                      return DropdownMenuItem<String?>(
                        value: m.uid,
                        child: Text(
                          '$displayName ($roleLabel)',
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }),
                  ],
                  onChanged: (val) => setState(() => _selectedAssigneeUid = val),
                ),
                const SizedBox(height: 16),

                // Due Date Picker
                Text(
                  'Due Date (Optional)',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: PulseTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 3)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) {
                      setState(() => _dueDate = picked);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: PulseTheme.border),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today, size: 18, color: PulseTheme.primary),
                        const SizedBox(width: 10),
                        Text(
                          _dueDate != null
                              ? DateFormat('EEE, MMM d, yyyy').format(_dueDate!)
                              : 'Select a deadline...',
                          style: GoogleFonts.plusJakartaSans(
                            color: _dueDate != null ? PulseTheme.textPrimary : PulseTheme.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: PulseTheme.accent),
                        )
                      : const Text('Add Task & Notify Assignee'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
