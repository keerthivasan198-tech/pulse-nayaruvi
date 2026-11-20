import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/theme.dart';
import 'pulse_logo.dart';

/// Animated entrance overlay that presents pulse-logo.svg in the center
/// and smoothly glides it to the top-left corner once the page is opened.
class SplashIntroOverlay extends StatefulWidget {
  final Widget child;

  const SplashIntroOverlay({
    super.key,
    required this.child,
  });

  @override
  State<SplashIntroOverlay> createState() => _SplashIntroOverlayState();
}

class _SplashIntroOverlayState extends State<SplashIntroOverlay>
    with TickerProviderStateMixin {
  late final AnimationController _introController;
  late final AnimationController _moveController;

  late final Animation<double> _introScale;
  late final Animation<double> _introOpacity;
  late final Animation<double> _textOpacity;

  late final Animation<double> _moveProgress;
  late final Animation<double> _backdropOpacity;
  late final Animation<double> _textFadeOut;

  bool _isAnimationComplete = false;

  @override
  void initState() {
    super.initState();

    // 1. Initial entrance controller: logo and text appear front & center
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _introScale = Tween<double>(begin: 0.65, end: 1.0).animate(
      CurvedAnimation(parent: _introController, curve: Curves.easeOutBack),
    );

    _introOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _introController, curve: Curves.easeOut),
    );

    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
      ),
    );

    // 2. Gliding controller: logo glides from center to top-left corner
    _moveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    _moveProgress = CurvedAnimation(
      parent: _moveController,
      curve: Curves.easeInOutCubic,
    );

    _backdropOpacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _moveController,
        curve: const Interval(0.2, 1.0, curve: Curves.easeOut),
      ),
    );

    _textFadeOut = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _moveController,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOut),
      ),
    );

    _moveController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        if (mounted) {
          setState(() {
            _isAnimationComplete = true;
          });
        }
      }
    });

    _startSequence();
  }

  Future<void> _startSequence() async {
    // Start entrance animation
    await _introController.forward();

    // Pause front and center for user recognition
    await Future.delayed(const Duration(milliseconds: 700));

    // Begin moving to top-left corner
    if (mounted) {
      _moveController.forward();
    }
  }

  @override
  void dispose() {
    _introController.dispose();
    _moveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isAnimationComplete) {
      return widget.child;
    }

    final mediaQuery = MediaQuery.of(context);
    final screenSize = mediaQuery.size;
    final topPadding = mediaQuery.padding.top;

    // Start coordinates (Front & Center)
    const startSize = 110.0;
    final startX = (screenSize.width - startSize) / 2;
    final startY = (screenSize.height - startSize) / 2 - 20;

    // Destination coordinates (Top-Left Corner in AppBar)
    const endSize = 34.0;
    const endX = 16.0;
    final endY = topPadding + 11.0;

    return Stack(
      children: [
        // The actual application page (loads underneath during splash)
        widget.child,

        // Splash Intro Animated Overlay
        AnimatedBuilder(
          animation: Listenable.merge([_introController, _moveController]),
          builder: (context, _) {
            final t = _moveProgress.value;

            // Interpolate position and size from center to top-left
            final currentX = Tween<double>(begin: startX, end: endX).transform(t);
            final currentY = Tween<double>(begin: startY, end: endY).transform(t);
            final currentSize = Tween<double>(begin: startSize, end: endSize).transform(t);

            return IgnorePointer(
              ignoring: _moveController.value > 0.3,
              child: Stack(
                children: [
                  // Smooth backdrop fade out
                  Opacity(
                    opacity: _backdropOpacity.value.clamp(0.0, 1.0),
                    child: Container(
                      width: double.infinity,
                      height: double.infinity,
                      color: PulseTheme.background,
                    ),
                  ),

                  // Centered Brand Title & Subtitle (Fades out when gliding begins)
                  if (_textFadeOut.value > 0.01)
                    Positioned(
                      top: startY + startSize + 22,
                      left: 0,
                      right: 0,
                      child: Opacity(
                        opacity: (_textOpacity.value * _textFadeOut.value).clamp(0.0, 1.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'NAYARUVI',
                              style: GoogleFonts.outfit(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                color: PulseTheme.primary,
                                letterSpacing: 3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'PULSE',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: PulseTheme.primary.withValues(alpha: 0.7),
                                letterSpacing: 4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // The Animated Pulse SVG Logo
                  Positioned(
                    top: currentY,
                    left: currentX,
                    width: currentSize,
                    height: currentSize,
                    child: Opacity(
                      opacity: _introOpacity.value.clamp(0.0, 1.0),
                      child: Transform.scale(
                        scale: _introScale.value,
                        child: PulseLogo(
                          width: currentSize,
                          height: currentSize,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
