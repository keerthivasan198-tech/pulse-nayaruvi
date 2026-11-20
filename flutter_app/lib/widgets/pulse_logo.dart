import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Crisp vector branding logo rendered directly from pulse-logo.svg
class PulseLogo extends StatelessWidget {
  final double width;
  final double height;
  final BoxFit fit;

  const PulseLogo({
    super.key,
    this.width = 32,
    this.height = 32,
    this.fit = BoxFit.contain,
  });

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/pulse-logo.svg',
      width: width,
      height: height,
      fit: fit,
    );
  }
}
