import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';

class ChecklistScreen extends StatefulWidget {
  const ChecklistScreen({super.key});

  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  String _selectedScope = 'all'; // 'all', 'common', 'tasks'

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final activeProject = state.activeProject;

    if (activeProject == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.checklist_rtl_rounded, size: 48, color: PulseTheme.textMuted),
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
                'Select a project above to view its checklist deliverables.',
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

    final visibleItems = state.visibleChecklist;
    final commonItems = state.commonChecklist;
    final myTaskItems = state.myTaskChecklist;

    List<ChecklistItem> displayedItems;
    if (_selectedScope == 'common') {
      displayedItems = commonItems;
    } else if (_selectedScope == 'tasks') {
      displayedItems = myTaskItems;
    } else {
      displayedItems = visibleItems;
    }

    final totalCount = displayedItems.length;
    final completedCount = displayedItems.where((item) => item.completed).length;
    final progress = totalCount > 0 ? (completedCount / totalCount) : 0.0;
    final percentage = (progress * 100).round();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          // Scope Filter Tabs (All, Common, My Task Checklist)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildFilterChip(
                  label: 'All Visible',
                  scope: 'all',
                  count: visibleItems.length,
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'Common (All)',
                  scope: 'common',
                  count: commonItems.length,
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'My Task Checklist',
                  scope: 'tasks',
                  count: myTaskItems.length,
                ),
              ],
            ),
          ),

          // Progress Summary Banner
          Container(
            margin: const EdgeInsets.fromLTRB(16, 2, 16, 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: PulseTheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: PulseTheme.border),
              boxShadow: [
                BoxShadow(
                  color: PulseTheme.primary.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _selectedScope == 'common'
                          ? 'COMMON DELIVERABLES'
                          : _selectedScope == 'tasks'
                              ? 'MY TASK DELIVERABLES'
                              : 'TOTAL DELIVERABLES',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.textSecondary,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      '$completedCount of $totalCount Done ($percentage%)',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: totalCount > 0 ? progress : 0,
                    minHeight: 8,
                    backgroundColor: PulseTheme.border,
                    valueColor: const AlwaysStoppedAnimation<Color>(PulseTheme.colCompleted),
                  ),
                ),
              ],
            ),
          ),

          // Checklist Items List
          Expanded(
            child: displayedItems.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.checklist, size: 48, color: PulseTheme.textMuted),
                          const SizedBox(height: 12),
                          Text(
                            _selectedScope == 'tasks'
                                ? 'No task-specific checklist items'
                                : _selectedScope == 'common'
                                    ? 'No common checklist items'
                                    : 'No checklist items yet',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: PulseTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _selectedScope == 'tasks'
                                ? 'Checklist items assigned specifically to your tasks will appear here.'
                                : 'Deliverables will appear here once added in the workspace.',
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
                    itemCount: displayedItems.length,
                    itemBuilder: (context, index) {
                      final item = displayedItems[index];
                      final isDone = item.completed;
                      final isCommon = item.isCommon ||
                          (item.taskId.isEmpty && item.assigneeId.isEmpty && item.assigneeEmail.isEmpty);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: PulseTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDone ? PulseTheme.colCompleted.withValues(alpha: 0.3) : PulseTheme.border,
                          ),
                        ),
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
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    item.text,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      decoration: isDone ? TextDecoration.lineThrough : null,
                                      color: isDone ? PulseTheme.textMuted : PulseTheme.textPrimary,
                                    ),
                                  ),
                                ),
                                if (isDone)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: PulseTheme.colCompleted.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'DONE',
                                      style: GoogleFonts.outfit(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: PulseTheme.colCompleted,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            // Badge indicating Common vs Task-Specific
                            Row(
                              children: [
                                const SizedBox(width: 32),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isCommon
                                        ? PulseTheme.primary.withValues(alpha: 0.08)
                                        : Colors.purple.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: isCommon
                                          ? PulseTheme.primary.withValues(alpha: 0.2)
                                          : Colors.purple.shade200,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isCommon ? Icons.public : Icons.assignment_outlined,
                                        size: 11,
                                        color: isCommon ? PulseTheme.primary : Colors.purple.shade700,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isCommon
                                            ? 'Common (All Members)'
                                            : item.taskTitle.isNotEmpty
                                                ? 'Task: ${item.taskTitle}'
                                                : 'Assigned to You',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isCommon ? PulseTheme.primary : Colors.purple.shade800,
                                        ),
                                      ),
                                    ],
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
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required String scope,
    required int count,
  }) {
    final isSelected = _selectedScope == scope;

    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
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
        if (val) setState(() => _selectedScope = scope);
      },
    );
  }
}
