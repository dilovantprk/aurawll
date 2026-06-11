package com.aura.wellness.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sin

private data class AmbientSound(
    val id: String,
    val title: String,
    val category: String,
    val icon: String,
    val categoryColor: Color
)

private val ambientSounds = listOf(
    AmbientSound("rain", "Yumuşak Yağmur", "doğa", "🌧️", Color(0xFF64E49F)),
    AmbientSound("ocean", "Okyanus Dalgaları", "doğa", "🌊", Color(0xFF64E49F)),
    AmbientSound("birds", "Orman Kuşları", "doğa", "🐦", Color(0xFF64E49F)),
    AmbientSound("tropical", "Tropik Orman", "doğa", "🌴", Color(0xFF64E49F)),
    AmbientSound("creek", "Dere Akıntısı", "doğa", "🏵️", Color(0xFF64E49F)),
    AmbientSound("whale", "Sualtı Balina", "doğa", "🐋", Color(0xFF64E49F)),
    AmbientSound("storm", "Fırtınalı Gece", "doğa", "⛈️", Color(0xFF64E49F)),
    AmbientSound("night", "Gece Huzuru", "doğa", "🌙", Color(0xFF64E49F)),
    AmbientSound("pink", "Pembe Gürültü", "gürültü", "🎧", Color(0xFFFBA044)),
    AmbientSound("brown", "Kahverengi Gürültü", "gürültü", "🎧", Color(0xFFFBA044)),
    AmbientSound("focus_freq", "Odak Frekansı", "binaural", "🧠", Color(0xFF858DFF)),
    AmbientSound("relax_freq", "Rahatlama Frekansı", "binaural", "🧘", Color(0xFF858DFF)),
    AmbientSound("sleep_freq", "Uyku Frekansı", "binaural", "😴", Color(0xFF858DFF))
)

@Composable
fun AmbientScreen(onBack: () -> Unit) {
    var selectedSound by remember { mutableStateOf<String?>(null) }
    var volume by remember { mutableFloatStateOf(0.7f) }
    var activeInfoKey by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Top bar: section label + info button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ORTAM ALANI",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
                color = Color.White.copy(alpha = 0.4f)
            )
            IconButton(
                onClick = { activeInfoKey = "ambient" },
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Bilgi",
                    tint = Color.White.copy(alpha = 0.4f),
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Title
        Text(
            text = "Duyusal dengenizi bulun",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Subtitle
        Text(
            text = "Sinir sisteminiz için seçilmiş ses ortamları",
            fontSize = 14.sp,
            color = Color.White.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Sound Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(ambientSounds, key = { it.id }) { sound ->
                AmbientSoundCard(
                    sound = sound,
                    isActive = selectedSound == sound.id,
                    onClick = {
                        selectedSound = if (selectedSound == sound.id) null else sound.id
                    }
                )
            }
            // Bottom spacer item for scroll padding
            item { Spacer(modifier = Modifier.height(8.dp)) }
            item { Spacer(modifier = Modifier.height(8.dp)) }
        }

        // Volume slider area
        if (selectedSound != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White.copy(alpha = 0.04f)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Ses Seviyesi",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.5f),
                        modifier = Modifier.width(80.dp)
                    )
                    Slider(
                        value = volume,
                        onValueChange = { volume = it },
                        modifier = Modifier.weight(1f),
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF858DFF),
                            activeTrackColor = Color(0xFF858DFF),
                            inactiveTrackColor = Color.White.copy(alpha = 0.1f)
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }

    // Info dialog
    activeInfoKey?.let { key ->
        AuraInfoDialog(infoKey = key) {
            activeInfoKey = null
        }
    }
}

@Composable
private fun AmbientSoundCard(
    sound: AmbientSound,
    isActive: Boolean,
    onClick: () -> Unit
) {
    val borderColor = if (isActive) sound.categoryColor.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.08f)
    val bgColor = if (isActive) sound.categoryColor.copy(alpha = 0.08f) else Color.White.copy(alpha = 0.04f)

    // Liquid wave animation
    val infiniteTransition = rememberInfiniteTransition(label = "wave_${sound.id}")
    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase_${sound.id}"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.9f)
            .border(1.dp, borderColor, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Liquid wave canvas at bottom (only when active)
            if (isActive) {
                Canvas(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.25f)
                        .align(Alignment.BottomCenter)
                ) {
                    val waveColor = sound.categoryColor.copy(alpha = 0.15f)
                    val width = size.width
                    val height = size.height
                    val path = Path()

                    path.moveTo(0f, height)
                    val step = 4f
                    var x = 0f
                    while (x <= width) {
                        val y = height * 0.4f + sin((x / width) * 4f * Math.PI.toFloat() + wavePhase) * height * 0.35f
                        path.lineTo(x, y)
                        x += step
                    }
                    path.lineTo(width, height)
                    path.close()

                    drawPath(path = path, color = waveColor, style = Fill)

                    // Second wave layer
                    val path2 = Path()
                    path2.moveTo(0f, height)
                    x = 0f
                    while (x <= width) {
                        val y = height * 0.55f + sin((x / width) * 3f * Math.PI.toFloat() + wavePhase + 1.5f) * height * 0.25f
                        path2.lineTo(x, y)
                        x += step
                    }
                    path2.lineTo(width, height)
                    path2.close()

                    drawPath(path = path2, color = waveColor.copy(alpha = 0.1f), style = Fill)
                }
            }

            // Card content
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    // Category tag
                    Text(
                        text = sound.category.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = sound.categoryColor
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Title
                    Text(
                        text = sound.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    // Icon emoji
                    Text(
                        text = sound.icon,
                        fontSize = 24.sp
                    )

                    // Play/pause button
                    Card(
                        modifier = Modifier
                            .size(32.dp),
                        shape = CircleShape,
                        colors = CardDefaults.cardColors(
                            containerColor = if (isActive) sound.categoryColor.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.08f)
                        )
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isActive) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(modifier = Modifier.width(3.dp).height(10.dp).background(sound.categoryColor))
                                    Box(modifier = Modifier.width(3.dp).height(10.dp).background(sound.categoryColor))
                                }
                            } else {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Oynat",
                                    tint = Color.White.copy(alpha = 0.6f),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
