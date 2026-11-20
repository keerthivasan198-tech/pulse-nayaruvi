import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../tasks/tasks_screen.dart';
import '../tasks/add_task_dialog.dart';
import 'notifications_sheet.dart';
import '../checklist/checklist_screen.dart';
import '../activity/activity_screen.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    TasksScreen(),
    ChecklistScreen(),
    ActivityScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final activeWs = state.activeWorkspace;
    final activeProj = state.activeProject;
    final workspaces = state.workspaces;
    final projects = state.projects;
    final currentUid = state.currentUser?.uid ?? '';
    final isWsOwner = activeWs != null && activeWs.isOwner(currentUid);

    return Scaffold(
      backgroundColor: PulseTheme.background,
      appBar: AppBar(
        titleSpacing: 16,
        actions: [
          // In-App Notification Bell with Badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: PulseTheme.primary),
                tooltip: 'Notifications & Messages',
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (ctx) => const NotificationsSheet(),
                  );
                },
              ),
              if (state.unreadNotificationCount > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${state.unreadNotificationCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          if (activeProj != null)
            IconButton(
              icon: const Icon(Icons.add_task, color: PulseTheme.primary),
              tooltip: 'Create New Task',
              onPressed: () => showDialog(
                context: context,
                builder: (ctx) => const AddTaskDialog(),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.add_business_outlined, color: PulseTheme.primary),
            tooltip: 'Create New Workspace',
            onPressed: () => _showCreateWorkspaceDialog(context, state),
          ),
        ],
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: PulseTheme.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.bolt, color: PulseTheme.accent, size: 20),
            ),
            const SizedBox(width: 10),
            // Workspace Dropdown Selector
            Expanded(
              child: workspaces.isEmpty
                  ? Text(
                      'Nayaruvi Pulse',
                      style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                    )
                  : Builder(builder: (context) {
                      final uniqueWorkspaces = <String, Workspace>{};
                      for (final ws in workspaces) {
                        uniqueWorkspaces[ws.id] = ws;
                      }
                      final wsList = uniqueWorkspaces.values.toList();
                      final currentId = activeWs != null && uniqueWorkspaces.containsKey(activeWs.id)
                          ? activeWs.id
                          : (wsList.isNotEmpty ? wsList.first.id : null);

                      return DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: currentId,
                          isExpanded: true,
                          icon: const Icon(Icons.keyboard_arrow_down, size: 20, color: PulseTheme.primary),
                          selectedItemBuilder: (ctx) {
                            return wsList.map((ws) {
                              final isOwner = ws.isOwner(currentUid);
                              return Align(
                                alignment: Alignment.centerLeft,
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Flexible(
                                      child: Text(
                                        ws.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.outfit(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: PulseTheme.textPrimary,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: isOwner
                                            ? const Color(0xFFFEF3C7)
                                            : PulseTheme.surface,
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(
                                          color: isOwner
                                              ? const Color(0xFFF59E0B).withValues(alpha: 0.4)
                                              : PulseTheme.border,
                                        ),
                                      ),
                                      child: Text(
                                        isOwner ? 'Owner' : 'Member',
                                        style: GoogleFonts.outfit(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: isOwner
                                              ? const Color(0xFF92400E)
                                              : PulseTheme.textSecondary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList();
                          },
                          items: wsList.map((ws) {
                            final isOwner = ws.isOwner(currentUid);
                            return DropdownMenuItem<String>(
                              value: ws.id,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      ws.name,
                                      style: GoogleFonts.plusJakartaSans(
                                        fontWeight: ws.id == currentId ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isOwner ? const Color(0xFFFEF3C7) : PulseTheme.background,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      isOwner ? 'Owner' : 'Member',
                                      style: GoogleFonts.outfit(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isOwner ? const Color(0xFF92400E) : PulseTheme.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null && uniqueWorkspaces.containsKey(val)) {
                              state.setActiveWorkspace(uniqueWorkspaces[val]!);
                            }
                          },
                        ),
                      );
                    }),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight((projects.isNotEmpty || isWsOwner) ? 48.0 : 0.0),
          child: (projects.isNotEmpty || isWsOwner)
              ? Container(
                  height: 48,
                  decoration: const BoxDecoration(
                    color: PulseTheme.surface,
                    border: Border(bottom: BorderSide(color: PulseTheme.border)),
                  ),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: projects.length + (isWsOwner ? 1 : 0),
                    itemBuilder: (ctx, idx) {
                      // Show "+ Project" button ONLY to Workspace Owner
                      if (idx == projects.length) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: InkWell(
                            onTap: () => _showCreateProjectDialog(context, state),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: PulseTheme.primary.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: PulseTheme.primary.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.add, size: 14, color: PulseTheme.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    'New Project',
                                    style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: PulseTheme.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }

                      final p = projects[idx];
                      final isSelected = p.id == activeProj?.id;
                      final hasInfo = state.projectHasInformation(p);
                      final assignedCount = state.projectAssignedTaskCount(p);

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () => state.setActiveProject(p),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? PulseTheme.primary : PulseTheme.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSelected ? PulseTheme.primary : PulseTheme.border,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (hasInfo) ...[
                                  Container(
                                    width: 7,
                                    height: 7,
                                    margin: const EdgeInsets.only(right: 6),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? PulseTheme.accent
                                          : const Color(0xFF10B981),
                                      shape: BoxShape.circle,
                                       boxShadow: [
                                        BoxShadow(
                                          color: (isSelected
                                                  ? PulseTheme.accent
                                                  : const Color(0xFF10B981))
                                              .withValues(alpha: 0.6),
                                          blurRadius: 4,
                                          spreadRadius: 1,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                Text(
                                  p.title,
                                  style: GoogleFonts.outfit(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? PulseTheme.accent : PulseTheme.textPrimary,
                                  ),
                                ),
                                if (assignedCount > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? PulseTheme.accent.withValues(alpha: 0.25)
                                          : PulseTheme.primary.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '$assignedCount',
                                      style: GoogleFonts.outfit(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isSelected ? PulseTheme.accent : PulseTheme.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: PulseTheme.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: PulseTheme.surface,
          selectedItemColor: PulseTheme.primary,
          unselectedItemColor: PulseTheme.textSecondary,
          selectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 11),
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined),
              activeIcon: Icon(Icons.assignment),
              label: 'My Tasks',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.checklist_rtl_outlined),
              activeIcon: Icon(Icons.checklist_rtl_rounded),
              label: 'Checklist',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.campaign_outlined),
              activeIcon: Icon(Icons.campaign),
              label: 'Announce',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateWorkspaceDialog(BuildContext context, AppState state) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: PulseTheme.surface,
        title: Text('Create Workspace', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter a name for your new workspace. You will be the Workspace Owner.',
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: PulseTheme.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'e.g. Acme Corp Workspace',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: PulseTheme.primary),
            onPressed: () async {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx);
              try {
                await state.createWorkspace(text);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to create workspace: $e')),
                  );
                }
              }
            },
            child: const Text('Create', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showCreateProjectDialog(BuildContext context, AppState state) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: PulseTheme.surface,
        title: Text('Create Project', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Only the Workspace Owner can create projects in this workspace.',
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: PulseTheme.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'e.g. Mobile App Redesign',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: PulseTheme.primary),
            onPressed: () async {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx);
              try {
                await state.createProject(text);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to create project: $e')),
                  );
                }
              }
            },
            child: const Text('Create', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
