import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../providers/app_state.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final activities = state.activities;
    final activeProj = state.activeProject;

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
                      'Team updates and announcements from the workspace will appear here.',
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
              padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 20),
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
                      Row(
                        children: [
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
                          if (activeProj != null) ...[
                            const Spacer(),
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
                                    activeProj.title,
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
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
