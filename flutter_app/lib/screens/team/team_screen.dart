import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  final List<String> _roles = [
    'Founder',
    'Co-Founder',
    'Admin',
    'Lead Developer',
    'Product Designer',
    'Frontend Developer',
    'Backend Developer',
    'QA Engineer',
    'Member',
  ];

  void _showInviteDialog() {
    final emailController = TextEditingController();
    String selectedRole = 'Member';
    bool isInviting = false;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: PulseTheme.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  const Icon(Icons.person_add, color: PulseTheme.primary, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    'Invite Team Member',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: PulseTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Enter their email address to send an automated invitation to this project.',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      color: PulseTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'colleague@nayaruvi.com',
                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Assign Role',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: PulseTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: selectedRole,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.badge_outlined, size: 20),
                    ),
                    items: _roles.map((r) {
                      return DropdownMenuItem(value: r, child: Text(r));
                    }).toList(),
                    onChanged: (v) => setDialogState(() => selectedRole = v ?? 'Member'),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isInviting ? null : () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isInviting
                      ? null
                      : () async {
                          final email = emailController.text.trim();
                          if (email.isEmpty || !email.contains('@')) return;

                          final state = Provider.of<AppState>(context, listen: false);
                          if (state.activeWorkspace == null || state.activeProject == null) return;

                          final messenger = ScaffoldMessenger.of(context);
                          setDialogState(() => isInviting = true);

                          final res = await ApiService.sendMemberInvite(
                            email: email,
                            role: selectedRole,
                            workspaceId: state.activeWorkspace!.id,
                            projectId: state.activeProject!.id,
                            inviterName: state.currentUser?.displayName ?? 'Admin',
                            projectTitle: state.activeProject!.title,
                            workspaceName: state.activeWorkspace!.name,
                          );

                          if (dialogCtx.mounted) {
                            Navigator.pop(dialogCtx);
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(
                                  res['emailSent'] == true
                                      ? '🎉 Invitation email sent to $email as $selectedRole!'
                                      : 'Invite registered in project for $email!',
                                ),
                                backgroundColor: PulseTheme.primary,
                              ),
                            );
                          }
                        },
                  child: isInviting
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: PulseTheme.accent),
                        )
                      : const Text('Send Invitation'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final members = state.members;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: members.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.group_outlined, size: 48, color: PulseTheme.textMuted),
                    const SizedBox(height: 12),
                    Text(
                      'No members listed yet',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Invite teammates to collaborate on this project',
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
              padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 80),
              itemCount: members.length,
              itemBuilder: (context, index) {
                final m = members[index];

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: PulseTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: PulseTheme.border),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: PulseTheme.primary,
                        child: Text(
                          m.name.isNotEmpty ? m.name[0].toUpperCase() : 'M',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: PulseTheme.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.name,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: PulseTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              m.email.isNotEmpty ? m.email : 'member@nayaruvi.com',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                color: PulseTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: PulseTheme.background,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: PulseTheme.border),
                        ),
                        child: Text(
                          m.role,
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: PulseTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: PulseTheme.primary,
        foregroundColor: PulseTheme.accent,
        elevation: 2,
        onPressed: _showInviteDialog,
        icon: const Icon(Icons.person_add),
        label: Text(
          'Invite Member',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
