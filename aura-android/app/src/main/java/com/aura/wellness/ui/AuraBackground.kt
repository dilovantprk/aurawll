package com.aura.wellness.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

@Composable
fun AuraBackground(
    vagalState: String?,
    modifier: Modifier = Modifier
) {
    // Map vagal state to color matching the web's design system
    val targetColor = when (vagalState) {
        "ventral" -> Color(0xFF64E49F) // Ventral Green
        "sympathetic" -> Color(0xFFFBA044) // Sympathetic Orange
        "dorsal" -> Color(0xFF62A4FF) // Dorsal Blue
        else -> Color(0xFF858DFF) // Default Accent Primary (Lavender)
    }

    val animatedColor by animateColorAsState(
        targetValue = targetColor,
        animationSpec = tween(durationMillis = 2000, easing = EaseInOutCubic),
        label = "vagalColor"
    )

    // Breath pulsation animation (breathes at a natural rate)
    val infiniteTransition = rememberInfiniteTransition(label = "breath")
    val breathScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathScale"
    )
    val centralGlowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 0.65f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "centralGlowAlpha"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .scale(breathScale)
            .background(Color(0xFF050508)) // Web bg-primary (Deep Space Siyahı)
            .drawBehind {
                val size = this.size

                // 1. Bottom-Left constant Dorsal (blue) glow
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0x1A62A4FF), Color.Transparent),
                        center = Offset(size.width * 0.15f, size.height * 0.85f),
                        radius = size.width * 0.8f
                    )
                )

                // 2. Top-Right constant Ventral (green) glow
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0x1A64E49F), Color.Transparent),
                        center = Offset(size.width * 0.85f, size.height * 0.15f),
                        radius = size.width * 0.8f
                    )
                )

                // 3. Central dynamic Vagal state glow
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            animatedColor.copy(alpha = centralGlowAlpha),
                            Color.Transparent
                        ),
                        center = Offset(size.width * 0.5f, size.height * 0.4f),
                        radius = size.width * 0.9f
                    )
                )
            }
    )
}
