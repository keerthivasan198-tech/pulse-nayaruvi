import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../services/database_service.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  final DatabaseService _dbService = DatabaseService();

  void _showPostAnnouncementDialog() {
    final textController = TextEditingController();
    bool isPosting = false;

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
                  const Icon(Icons.campaign, color: PulseTheme.primary, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Post Announcement',
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
                    'This announcement will be posted to the team feed and automatically emailed to all members.',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      color: PulseTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: textController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Share a status update, deadline, or Google Meet link...',
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isPosting ? null : () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isPosting
                      ? null
                      : () async {
                          final text = textController.text.trim();
                          if (text.isEmpty) return;

                          final state = Provider.of<AppState>(context, listen: false);
                          if (state.activeWorkspace == null) return;

                          final messenger = ScaffoldMessenger.of(context);
                          setDialogState(() => isPosting = true);

                          final authorName = state.currentUser?.displayName ?? 'Team Lead';
                          final projTitle = state.activeProject?.title ?? '';
                          final wsName = state.activeWorkspace?.name ?? 'Workspace';

                          // 1. Post to RTDB
                          await _dbService.postAnnouncement(
                            state.activeWorkspace!.id,
                            ActivityItem(
                              id: '',
                              user: authorName,
                              action: 'posted an announcement',
                              target: projTitle.isNotEmpty ? 'in $projTitle' : 'to the Workspace',
                              content: text,
                              type: 'announcement',
                              workspaceId: state.activeWorkspace!.id,
                              projectId: state.activeProject?.id,
                              timestamp: DateTime.now().toIso8601String(),
                            ),
                          );

                          // 2. Collect emails & notify
                          final recipientEmails = state.members
                              .map((m) => m.email.trim())
                              .where((e) => e.isNotEmpty && e.contains('@'))
                              .toList();

                          if (recipientEmails.isNotEmpty) {
                            ApiService.sendAnnouncementNotification(
                              announcement: text,
                              authorName: authorName,
                              projectTitle: projTitle,
                              workspaceName: wsName,
                              recipients: recipientEmails,
                              workspaceId: state.activeWorkspace!.id,
                              projectId: state.activeProject?.id,
                            );
                          }

                          if (dialogCtx.mounted) {
                            Navigator.pop(dialogCtx);
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(
                                  recipientEmails.isNotEmpty
                                      ? '📢 Announcement posted & emailed to ${recipientEmails.length} team members!'
                                      : '📢 Announcement posted to workspace feed!',
                                ),
                                backgroundColor: PulseTheme.primary,
                              ),
                            );
                          }
                        },
                  child: isPosting
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: PulseTheme.accent),
                        )
                      : const Text('Post & Email Team'),
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
    final activities = state.activities;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: activities.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.campaign_outlined, size: 48, color: PulseTheme.textMuted),
                    const SizedBox(height: 12),
                    Text(
                      'No announcements yet',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Post an update or meeting link to notify your team',
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
              itemCount: activities.length,
              itemBuilder: (context, index) {
                final act = activities[index];

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: PulseTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: PulseTheme.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: PulseTheme.primary,
                            child: Text(
                              act.user.isNotEmpty ? act.user[0].toUpperCase() : 'U',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: PulseTheme.accent,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  color: PulseTheme.textPrimary,
                                ),
                                children: [
                                  TextSpan(
                                    text: act.user,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  TextSpan(text: ' ${act.action} '),
                                  TextSpan(
                                    text: act.target,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (act.content.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: PulseTheme.background,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: PulseTheme.border),
                          ),
                          child: Text(
                            act.content,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              color: PulseTheme.textPrimary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        DateTime.tryParse(act.timestamp) != null
                            ? DateTime.parse(act.timestamp).toLocal().toString().substring(0, 16)
                            : act.timestamp,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          color: PulseTheme.textMuted,
                          fontWeight: FontWeight.w600,
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
        onPressed: _showPostAnnouncementDialog,
        icon: const Icon(Icons.campaign),
        label: Text(
          'Post Update',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
