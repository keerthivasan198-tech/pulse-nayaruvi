import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PulseTheme {
  // Brand Colors
  static const Color primary = Color(0xFF274245);
  static const Color primaryHover = Color(0xFF1E3335);
  static const Color background = Color(0xFFFAF7EC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color accent = Color(0xFFDFD6AE);
  static const Color accentLight = Color(0xFFF3EED9);
  static const Color border = Color(0xFFE2DCB9);
  static const Color textPrimary = Color(0xFF274245);
  static const Color textSecondary = Color(0xFF718096);
  static const Color textMuted = Color(0xFFA0AEC0);

  // Status & Priorities
  static const Color priorityUrgent = Color(0xFFDC2626);
  static const Color priorityHigh = Color(0xFFEA580C);
  static const Color priorityMedium = Color(0xFF2563EB);
  static const Color priorityLow = Color(0xFF16A34A);

  // Kanban Columns
  static const Color colTodo = Color(0xFF4B5563);
  static const Color colProgress = Color(0xFFD97706);
  static const Color colReview = Color(0xFF7C3AED);
  static const Color colCompleted = Color(0xFF059669);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: accent,
        surface: surface,
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme().copyWith(
        displayLarge: GoogleFonts.outfit(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: textPrimary,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.outfit(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: textPrimary,
        ),
        titleMedium: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        bodyMedium: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          color: textPrimary,
        ),
        bodySmall: GoogleFonts.plusJakartaSans(
          fontSize: 12,
          color: textSecondary,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.outfit(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: textPrimary,
        ),
        iconTheme: const IconThemeData(color: primary),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        labelStyle: GoogleFonts.plusJakartaSans(color: textSecondary, fontSize: 13),
        hintStyle: GoogleFonts.plusJakartaSans(color: textMuted, fontSize: 13),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: accent,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
