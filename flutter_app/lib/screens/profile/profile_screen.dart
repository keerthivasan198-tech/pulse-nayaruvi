import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/theme.dart';
import '../../providers/app_state.dart';
import '../../services/auth_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController();
  final _bioController = TextEditingController();
  final AuthService _authService = AuthService();
  bool _isSaving = false;
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final user = Provider.of<AppState>(context).currentUser;
      if (user != null) {
        _nameController.text = user.displayName;
        _bioController.text = user.bio;
        _isInitialized = true;
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _isSaving = true);

    try {
      await state.updateProfile(
        name: _nameController.text.trim(),
        bio: _bioController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile saved to Firebase successfully!'),
            backgroundColor: PulseTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final user = state.currentUser;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Profile Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: PulseTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: PulseTheme.border),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: PulseTheme.primary,
                    child: Text(
                      user != null && user.displayName.isNotEmpty
                          ? user.displayName[0].toUpperCase()
                          : 'U',
                      style: GoogleFonts.outfit(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.accent,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.displayName ?? 'Nayaruvi User',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: PulseTheme.textPrimary,
                    ),
                  ),
                  Text(
                    user?.email ?? '',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      color: PulseTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: PulseTheme.background,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: PulseTheme.border),
                    ),
                    child: Text(
                      user?.role ?? 'Member',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: PulseTheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Edit Profile Form
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: PulseTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: PulseTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Full Name',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: PulseTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.person_outline, size: 20),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Text(
                    'About / Bio',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: PulseTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _bioController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Share what you work on at Nayaruvi...',
                    ),
                  ),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: _isSaving ? null : _saveProfile,
                    child: _isSaving
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: PulseTheme.accent),
                          )
                        : const Text('Save Profile Changes'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Sign Out Button
            OutlinedButton.icon(
              onPressed: () => _authService.signOut(),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.logout, size: 18),
              label: Text(
                'Sign Out of Account',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
