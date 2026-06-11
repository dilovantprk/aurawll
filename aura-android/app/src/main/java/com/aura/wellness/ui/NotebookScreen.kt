package com.aura.wellness.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

private val VentralColor = Color(0xFF64E49F)
private val SympatheticColor = Color(0xFFFBA044)
private val DorsalColor = Color(0xFF62A4FF)

private fun stateColor(state: String): Color = when (state) {
    "ventral" -> VentralColor
    "sympathetic" -> SympatheticColor
    "dorsal" -> DorsalColor
    else -> Color.White
}

private fun stateLabel(state: String): String = when (state) {
    "ventral" -> "Ventral"
    "sympathetic" -> "Sempatik"
    "dorsal" -> "Dorsal"
    else -> state
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun NotebookScreen(
    entries: List<CheckinEntry>,
    onDeleteEntry: (Int) -> Unit
) {
    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy, HH:mm", Locale("tr")) }
    var deleteTargetIndex by remember { mutableStateOf<Int?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .padding(horizontal = 20.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // ── Header ──
        Text(
            text = "NOTLAR",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Günlük Günlüğü",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Wellness yolculuğunuzun kaydı",
            fontSize = 14.sp,
            color = Color.White.copy(alpha = 0.6f)
        )
        Spacer(modifier = Modifier.height(24.dp))

        // ── Content ──
        if (entries.isEmpty()) {
            // Empty state
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "📓",
                        fontSize = 48.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Henüz kayıt yok",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Bir check-in tamamlayarak günlüğünüzü başlatın.",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.5f),
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                itemsIndexed(entries) { index, entry ->
                    val color = stateColor(entry.state)

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(
                                1.dp,
                                Color.White.copy(alpha = 0.08f),
                                RoundedCornerShape(20.dp)
                            ),
                        colors = CardDefaults.cardColors(
                            containerColor = Color.White.copy(alpha = 0.04f)
                        ),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth()) {
                            // Left accent bar
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .fillMaxHeight()
                                    .defaultMinSize(minHeight = 80.dp)
                                    .clip(
                                        RoundedCornerShape(
                                            topStart = 20.dp,
                                            bottomStart = 20.dp
                                        )
                                    )
                                    .background(color)
                            )

                            // Card content
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(14.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Colored orb with glow
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        // Glow layer
                                        Canvas(modifier = Modifier.size(28.dp)) {
                                            drawCircle(
                                                color = color.copy(alpha = 0.3f),
                                                radius = 14.dp.toPx()
                                            )
                                        }
                                        // Core orb
                                        Box(
                                            modifier = Modifier
                                                .size(20.dp)
                                                .clip(CircleShape)
                                                .background(color)
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(10.dp))

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = stateLabel(entry.state),
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = color
                                        )
                                        Text(
                                            text = dateFormatter.format(Date(entry.timestamp)),
                                            fontSize = 12.sp,
                                            color = Color.White.copy(alpha = 0.5f)
                                        )
                                    }

                                    // Delete button
                                    TextButton(
                                        onClick = { deleteTargetIndex = index },
                                        modifier = Modifier.size(32.dp),
                                        contentPadding = PaddingValues(0.dp)
                                    ) {
                                        Text(
                                            text = "×",
                                            fontSize = 18.sp,
                                            color = Color.White.copy(alpha = 0.3f),
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                // Emotion tags
                                if (entry.emotions.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        entry.emotions.forEach { emotion ->
                                            Box(
                                                modifier = Modifier
                                                    .border(
                                                        1.dp,
                                                        color.copy(alpha = 0.5f),
                                                        RoundedCornerShape(100.dp)
                                                    )
                                                    .padding(
                                                        horizontal = 10.dp,
                                                        vertical = 4.dp
                                                    )
                                            ) {
                                                Text(
                                                    text = emotion,
                                                    fontSize = 10.sp,
                                                    color = color
                                                )
                                            }
                                        }
                                    }
                                }

                                // Somatic tags (first 3)
                                if (entry.somaticKeys.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        entry.somaticKeys.take(3).forEach { key ->
                                            Box(
                                                modifier = Modifier
                                                    .border(
                                                        1.dp,
                                                        Color.White.copy(alpha = 0.3f),
                                                        RoundedCornerShape(100.dp)
                                                    )
                                                    .padding(
                                                        horizontal = 10.dp,
                                                        vertical = 4.dp
                                                    )
                                            ) {
                                                Text(
                                                    text = key,
                                                    fontSize = 10.sp,
                                                    color = Color.White.copy(alpha = 0.4f)
                                                )
                                            }
                                        }
                                    }
                                }

                                // Note text
                                if (entry.note.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = entry.note,
                                        fontSize = 13.sp,
                                        color = Color.White.copy(alpha = 0.7f),
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Delete Confirmation Dialog ──
    if (deleteTargetIndex != null) {
        AlertDialog(
            onDismissRequest = { deleteTargetIndex = null },
            title = {
                Text(
                    text = "Kaydı Sil",
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "Bu check-in kaydını silmek istediğinizden emin misiniz?",
                    color = Color.White.copy(alpha = 0.7f)
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        deleteTargetIndex?.let { onDeleteEntry(it) }
                        deleteTargetIndex = null
                    }
                ) {
                    Text(
                        text = "Sil",
                        color = Color(0xFFFF5555),
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteTargetIndex = null }) {
                    Text(
                        text = "İptal",
                        color = Color.White.copy(alpha = 0.6f)
                    )
                }
            },
            containerColor = Color(0xFF1A1A2E),
            shape = RoundedCornerShape(24.dp)
        )
    }
}
