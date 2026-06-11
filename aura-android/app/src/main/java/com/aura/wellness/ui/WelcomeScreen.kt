package com.aura.wellness.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun WelcomeScreen(onUnlock: () -> Unit) {
    var isPressing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val scaleFactor by animateFloatAsState(
        targetValue = if (isPressing) 1.4f else 1.0f,
        animationSpec = tween(durationMillis = 1500, easing = FastOutSlowInEasing),
        label = "coreScale"
    )

    val coreGlowAlpha by animateFloatAsState(
        targetValue = if (isPressing) 0.6f else 0.2f,
        animationSpec = tween(durationMillis = 1500, easing = LinearEasing),
        label = "coreGlow"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .padding(top = 80.dp, bottom = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Title Section
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Aura",
                fontSize = 56.sp,
                fontWeight = FontWeight.Light,
                color = Color.White,
                letterSpacing = (-2).sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "YOUR NERVOUS SYSTEM",
                fontSize = 12.sp,
                color = Color.White.copy(alpha = 0.6f),
                letterSpacing = 4.sp
            )
        }

        // Orbits and Core Section
        Box(
            modifier = Modifier.size(300.dp),
            contentAlignment = Alignment.Center
        ) {
            val infiniteTransition = rememberInfiniteTransition(label = "orbits")
            
            val outerRotation by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = 360f,
                animationSpec = infiniteRepeatable(
                    animation = tween(25000, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "outerRotation"
            )

            val innerRotation by infiniteTransition.animateFloat(
                initialValue = 360f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(15000, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "innerRotation"
            )

            // Outer Orbit
            Canvas(modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { rotationZ = outerRotation }
                .padding(16.dp)) {
                drawCircle(
                    color = Color.White.copy(alpha = 0.05f),
                    style = Stroke(width = 2f)
                )
            }

            // Inner Orbit
            Canvas(modifier = Modifier
                .fillMaxSize(0.6f)
                .graphicsLayer { rotationZ = innerRotation }) {
                drawCircle(
                    color = Color.White.copy(alpha = 0.1f),
                    style = Stroke(width = 2f)
                )
            }

            // Core (Clickable/Holdable)
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .scale(scaleFactor)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                Color.White.copy(alpha = coreGlowAlpha),
                                Color.Transparent
                            )
                        )
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.2f), CircleShape)
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = {
                                isPressing = true
                                val job = scope.launch {
                                    delay(1500)
                                    if (isPressing) {
                                        onUnlock()
                                    }
                                }
                                try {
                                    awaitRelease()
                                } finally {
                                    isPressing = false
                                    job.cancel()
                                }
                            }
                        )
                    }
            )
        }

        // Gesture Prompt
        Text(
            text = if (isPressing) "Nefes al ve tut..." else "Başlamak için parmağını merkezde tut",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp)
        )
    }
}
