import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../providers/app_state.dart';

class NotificationsSheet extends StatelessWidget {
  const NotificationsSheet({super.key});

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

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final notifs = state.notifications;
    final unreadCount = state.unreadNotificationCount;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: const BoxDecoration(
        color: PulseTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: PulseTheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.notifications_active, color: PulseTheme.primary, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Notifications',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: PulseTheme.textPrimary,
                    ),
                  ),
                  if (unreadCount > 0) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              Row(
                children: [
                  if (notifs.isNotEmpty)
                    TextButton.icon(
                      onPressed: () => state.clearAllNotifications(),
                      icon: const Icon(Icons.done_all, size: 16, color: PulseTheme.primary),
                      label: Text(
                        'Clear All',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: PulseTheme.primary,
                        ),
                      ),
                    ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: PulseTheme.border),

          // Notifications List
          Expanded(
            child: notifs.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.notifications_off_outlined, size: 48, color: PulseTheme.textMuted),
                          const SizedBox(height: 12),
                          Text(
                            'No notifications yet',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: PulseTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'When a task is assigned to you on the website or mobile app, instant messages will appear here.',
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
                    itemCount: notifs.length,
                    padding: const EdgeInsets.only(top: 8, bottom: 16),
                    itemBuilder: (ctx, index) {
                      final n = notifs[index];
                      final isUnread = !n.read;
                      final pColor = _getPriorityColor(n.priority);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: isUnread
                              ? PulseTheme.primary.withValues(alpha: 0.05)
                              : PulseTheme.background,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isUnread
                                ? PulseTheme.primary.withValues(alpha: 0.3)
                                : PulseTheme.border,
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () {
                            // Once seen, notification disappears immediately
                            state.dismissNotification(n.id);
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: PulseTheme.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.assignment_ind,
                                    size: 20,
                                    color: PulseTheme.primary,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              n.title,
                                              style: GoogleFonts.outfit(
                                                fontSize: 13,
                                                fontWeight: FontWeight.bold,
                                                color: PulseTheme.textPrimary,
                                              ),
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.check_circle_outline, size: 18, color: PulseTheme.textSecondary),
                                            tooltip: 'Mark seen & dismiss',
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            onPressed: () {
                                              state.dismissNotification(n.id);
                                            },
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        n.message,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 12,
                                          color: PulseTheme.textPrimary,
                                          height: 1.4,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          if (n.projectTitle.isNotEmpty) ...[
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: PulseTheme.primary.withValues(alpha: 0.08),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                n.projectTitle,
                                                style: GoogleFonts.outfit(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: PulseTheme.primary,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                          ],
                                          if (n.priority.isNotEmpty) ...[
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: pColor.withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                n.priority.toUpperCase(),
                                                style: GoogleFonts.outfit(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                  color: pColor,
                                                ),
                                              ),
                                            ),
                                          ],
                                          const Spacer(),
                                          if (n.timestamp.isNotEmpty)
                                            Text(
                                              DateTime.tryParse(n.timestamp) != null
                                                  ? DateTime.parse(n.timestamp).toLocal().toString().substring(0, 16)
                                                  : n.timestamp,
                                              style: GoogleFonts.plusJakartaSans(
                                                fontSize: 10,
                                                color: PulseTheme.textMuted,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
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
