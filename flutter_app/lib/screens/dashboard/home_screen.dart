import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../tasks/tasks_screen.dart';
import '../activity/activity_screen.dart';
import '../team/team_screen.dart';
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
    ActivityScreen(),
    TeamScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final activeWs = state.activeWorkspace;
    final activeProj = state.activeProject;
    final workspaces = state.workspaces;
    final projects = state.projects;

    return Scaffold(
      backgroundColor: PulseTheme.background,
      appBar: AppBar(
        titleSpacing: 16,
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
                  : DropdownButtonHideUnderline(
                      child: DropdownButton<Workspace>(
                        value: activeWs,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down, size: 20, color: PulseTheme.primary),
                        selectedItemBuilder: (ctx) {
                          return workspaces.map((ws) {
                            return Align(
                              alignment: Alignment.centerLeft,
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
                            );
                          }).toList();
                        },
                        items: workspaces.map((ws) {
                          return DropdownMenuItem(
                            value: ws,
                            child: Text(
                              ws.name,
                              style: GoogleFonts.plusJakartaSans(
                                fontWeight: ws.id == activeWs?.id ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) state.setActiveWorkspace(val);
                        },
                      ),
                    ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(projects.isNotEmpty ? 48.0 : 0.0),
          child: projects.isNotEmpty
              ? Container(
                  height: 48,
                  decoration: const BoxDecoration(
                    color: PulseTheme.surface,
                    border: Border(bottom: BorderSide(color: PulseTheme.border)),
                  ),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: projects.length,
                    itemBuilder: (ctx, idx) {
                      final p = projects[idx];
                      final isSelected = p.id == activeProj?.id;

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
                            child: Text(
                              p.title,
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? PulseTheme.accent : PulseTheme.textPrimary,
                              ),
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
              label: 'Tasks',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.campaign_outlined),
              activeIcon: Icon(Icons.campaign),
              label: 'Feed',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.group_outlined),
              activeIcon: Icon(Icons.group),
              label: 'Team',
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
}
