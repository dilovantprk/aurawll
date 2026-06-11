package com.aura.wellness.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    checkinHistory: List<CheckinEntry>,
    showNotebook: Boolean,
    showFocus: Boolean,
    showAmbient: Boolean,
    showSleep: Boolean,
    onToggleTab: (String) -> Unit,
    onResetMemory: () -> Unit,
    onNavigateToWelcome: () -> Unit
) {
    val scrollState = rememberScrollState()
    var showResetDialog by remember { mutableStateOf(false) }

    // Sensory states
    var hapticFeedback by remember { mutableStateOf(true) }
    var uiSounds by remember { mutableStateOf(true) }
    var dailyReminder by remember { mutableStateOf(true) }

    val totalEntries = checkinHistory.size

    val rank = when {
        totalEntries in 0..4 -> "Yeni Başlayan"
        totalEntries in 5..14 -> "Kaşif"
        totalEntries in 15..29 -> "Düzenli"
        totalEntries in 30..49 -> "Deneyimli"
        else -> "Vagal Usta"
    }

    val activeDays = remember(checkinHistory) {
        val formatter = SimpleDateFormat("yyyyMMdd", Locale.getDefault())
        checkinHistory.map { formatter.format(Date(it.timestamp)) }.distinct().size
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // HEADER
        Text(
            text = "AYARLAR",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Sinir Sistemi Profili",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(16.dp))

        // 1. Bio-Identity Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(32.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(32.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    text = "Misafir Kullanıcı",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Light,
                    color = Color.White,
                    letterSpacing = (-1).sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = rank,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF858DFF)
                    )
                    Text(
                        text = "$activeDays Aktif Gün",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "AUR-GUEST-X$totalEntries",
                    fontSize = 8.sp,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 1.sp,
                    color = Color.White.copy(alpha = 0.3f)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Vagal Signature Canvas
                Text(
                    text = "VAGAL İMZA (Son 10 Kayıt)",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    color = Color.White.copy(alpha = 0.4f)
                )
                Spacer(modifier = Modifier.height(8.dp))

                Canvas(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(12.dp))
                        .border(0.5.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                ) {
                    val width = size.width
                    val height = size.height

                    val lastTen = checkinHistory.takeLast(10)
                    if (lastTen.size < 2) {
                        // Not enough data points, draw placeholder wave
                        val path = Path()
                        path.moveTo(0f, height / 2f)
                        for (i in 1..10) {
                            val x = (i / 10f) * width
                            val y = height / 2f + Math.sin(i * 1.5).toFloat() * 15f
                            path.lineTo(x, y)
                        }
                        drawPath(
                            path = path,
                            color = Color.White.copy(alpha = 0.2f),
                            style = Stroke(width = 2.dp.toPx())
                        )
                    } else {
                        val path = Path()
                        lastTen.forEachIndexed { index, entry ->
                            val x = (index.toFloat() / (lastTen.size - 1)) * width
                            // Map states to Y value: ventral = 0.2f (top is 0), sympathetic = 0.5f, dorsal = 0.8f
                            val stateYRatio = when (entry.state) {
                                "ventral" -> 0.2f
                                "sympathetic" -> 0.5f
                                "dorsal" -> 0.8f
                                else -> 0.5f
                            }
                            val y = stateYRatio * height
                            if (index == 0) {
                                path.moveTo(x, y)
                            } else {
                                val prevX = ((index - 1).toFloat() / (lastTen.size - 1)) * width
                                val prevStateYRatio = when (lastTen[index - 1].state) {
                                    "ventral" -> 0.2f
                                    "sympathetic" -> 0.5f
                                    "dorsal" -> 0.8f
                                    else -> 0.5f
                                }
                                val prevY = prevStateYRatio * height
                                // Cubic control points for smooth wave
                                val cp1x = prevX + (x - prevX) / 2
                                path.cubicTo(cp1x, prevY, cp1x, y, x, y)
                            }
                        }
                        drawPath(
                            path = path,
                            color = Color(0xFF858DFF),
                            style = Stroke(width = 3.dp.toPx())
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 2. Badge System (6 badges)
        Text(
            text = "ROZETLER",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        // Badge list definitions & calculations
        val calendar = Calendar.getInstance()
        val uniqueProtocols = checkinHistory.mapNotNull { it.note.substringBefore(" ").takeIf { it.startsWith("p_") } }.distinct().size
        val hasEarlyBird = checkinHistory.any {
            calendar.timeInMillis = it.timestamp
            calendar.get(Calendar.HOUR_OF_DAY) in 5..8
        }
        val hasNightOwl = checkinHistory.any {
            calendar.timeInMillis = it.timestamp
            calendar.get(Calendar.HOUR_OF_DAY) >= 23 || calendar.get(Calendar.HOUR_OF_DAY) < 4
        }
        val isVagalMaster = totalEntries >= 7
        val isDeepTraveler = totalEntries >= 50

        // Check consecutive ventral entries
        var maxVentralStreak = 0
        var currentVentralStreak = 0
        checkinHistory.forEach {
            if (it.state == "ventral") {
                currentVentralStreak++
                if (currentVentralStreak > maxVentralStreak) {
                    maxVentralStreak = currentVentralStreak
                }
            } else {
                currentVentralStreak = 0
            }
        }
        val isDeepFocus = maxVentralStreak >= 3

        val badges = remember(checkinHistory) {
            listOf(
                BadgeData("🧭", "Kaşif", totalEntries >= 3),
                BadgeData("🌅", "Erken Kuş", hasEarlyBird),
                BadgeData("🌙", "Gece Kuşu", hasNightOwl),
                BadgeData("💚", "Vagal Usta", isVagalMaster),
                BadgeData("🚀", "İç Yolcu", isDeepTraveler),
                BadgeData("🎯", "Derin Odak", isDeepFocus)
            )
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(badges) { badge ->
                val opacity = if (badge.isEarned) 1.0f else 0.3f
                val borderAlpha = if (badge.isEarned) 0.4f else 0.08f
                val borderColor = if (badge.isEarned) Color(0xFF858DFF) else Color.White

                Card(
                    modifier = Modifier
                        .alpha(opacity)
                        .border(
                            1.dp,
                            borderColor.copy(alpha = borderAlpha),
                            RoundedCornerShape(20.dp)
                        ),
                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(text = badge.emoji, fontSize = 24.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = badge.name,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 3. Sensory Controls
        Text(
            text = "DUYUSAL KONTROLLER",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column {
                SettingsSwitchRow("Dokunsal Geri Bildirim", hapticFeedback) { hapticFeedback = it }
                SettingsSwitchRow("UI Sesleri", uiSounds) { uiSounds = it }
                SettingsSwitchRow("Günlük Hatırlatma", dailyReminder) { dailyReminder = it }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 4. Tab Visibility
        Text(
            text = "SEKME GÖRÜNÜRLÜĞÜ",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column {
                SettingsSwitchRow("Notlar Sekmesi", showNotebook) { onToggleTab("notebook") }
                SettingsSwitchRow("Odak Sekmesi", showFocus) { onToggleTab("focus") }
                SettingsSwitchRow("Ortam Sekmesi", showAmbient) { onToggleTab("ambient") }
                SettingsSwitchRow("Uyku Sekmesi", showSleep) { onToggleTab("sleep") }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 5. Data Sovereignty
        Text(
            text = "VERİ EGEMENLİĞİ",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Verileriniz yalnızca bu cihazda saklanır.",
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.5f)
                )
                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = { /* Backup logic or placeholder */ },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.05f)),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.08f))
                ) {
                    Text("JSON Yedek İndir", color = Color(0xFF858DFF), fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = { /* Export TXT summary logic or placeholder */ },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.05f)),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.08f))
                ) {
                    Text("TXT Özet İndir", color = Color(0xFF858DFF), fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Yakında: Bulut senkronizasyonu",
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.3f),
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 6. Danger Zone
        Text(
            text = "TEHLİKELİ BÖLGE",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color(0xFFFF6B6B),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFFFF6B6B).copy(alpha = 0.2f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.02f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Button(
                    onClick = { showResetDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B6B).copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFF6B6B).copy(alpha = 0.3f))
                ) {
                    Text("Hafızayı Temizle (Reset)", color = Color(0xFFFF6B6B), fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(48.dp))
    }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Hafızayı Temizle", color = Color.White) },
            text = { Text("Emin misiniz? Tüm check-in verileri silinecek.", color = Color.White.copy(alpha = 0.7f)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showResetDialog = false
                        onResetMemory()
                        onNavigateToWelcome()
                    }
                ) {
                    Text("Sil", color = Color(0xFFFF6B6B))
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("İptal", color = Color.White)
                }
            },
            containerColor = Color(0xFF1E1E24)
        )
    }
}

@Composable
private fun SettingsSwitchRow(
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                drawLine(
                    color = Color.White.copy(alpha = 0.06f),
                    start = Offset(0f, size.height),
                    end = Offset(size.width, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            .padding(vertical = 16.dp, horizontal = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = title, color = Color.White, fontSize = 14.sp)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedTrackColor = Color(0xFF858DFF),
                uncheckedTrackColor = Color.White.copy(alpha = 0.1f),
                uncheckedThumbColor = Color.White.copy(alpha = 0.5f)
            )
        )
    }
}

private data class BadgeData(
    val emoji: String,
    val name: String,
    val isEarned: Boolean
)
