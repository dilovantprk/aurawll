package com.aura.wellness.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Vagal state colors
private val VentralColor = Color(0xFF64E49F)
private val SympatheticColor = Color(0xFFFBA044)
private val DorsalColor = Color(0xFF62A4FF)
private val AccentPurple = Color(0xFF858DFF)

// Text colors
private val TitleWhite = Color.White
private val BodyWhite = Color.White.copy(alpha = 0.75f)
private val MutedWhite = Color.White.copy(alpha = 0.4f)

// Glass card styling
private val GlassCardBg = Color.White.copy(alpha = 0.04f)
private val GlassCardBorder = Color.White.copy(alpha = 0.08f)
private val GlassCardShape = RoundedCornerShape(24.dp)

@Composable
fun InsightScreen(
    recentEntries: List<CheckinEntry> = emptyList(),
    onBack: () -> Unit
) {
    val scrollState = rememberScrollState()

    // --- Computed analytics ---
    val stateCounts = remember(recentEntries) {
        val counts = mutableMapOf("ventral" to 0, "sympathetic" to 0, "dorsal" to 0)
        recentEntries.forEach { entry ->
            val key = entry.state.lowercase()
            counts[key] = (counts[key] ?: 0) + 1
        }
        counts
    }

    val totalEntries = remember(stateCounts) {
        stateCounts.values.sum().coerceAtLeast(1)
    }

    val dominantState = remember(stateCounts) {
        if (stateCounts.values.all { it == 0 }) "ventral"
        else stateCounts.maxByOrNull { it.value }?.key ?: "ventral"
    }

    val ventralRatio = remember(stateCounts, totalEntries) {
        stateCounts["ventral"]?.toFloat()?.div(totalEntries) ?: 0f
    }

    val resilienceScore = remember(recentEntries, ventralRatio) {
        if (recentEntries.size < 3) 50
        else (ventralRatio * 100).toInt().coerceIn(0, 100)
    }

    val heroTitle = remember(dominantState, resilienceScore) {
        when {
            dominantState == "ventral" && resilienceScore >= 80 -> "Çiçeklenme"
            dominantState == "ventral" -> "Dinginlik"
            dominantState == "sympathetic" -> "Fırtına"
            else -> "Puslu"
        }
    }

    val heroSubtitle = remember(dominantState) {
        when (dominantState) {
            "ventral" -> "Ventral — Güvenli Bölge"
            "sympathetic" -> "Sempatik — Savaş/Kaç"
            else -> "Dorsal — Don/Çök"
        }
    }

    val resilienceLabel = remember(resilienceScore) {
        when {
            resilienceScore > 70 -> "Yüksek Plastisite"
            resilienceScore in 40..70 -> "Orta Düzey"
            else -> "Dikkat Gerekli"
        }
    }

    val resilienceBarColor = remember(resilienceScore) {
        when {
            resilienceScore > 70 -> VentralColor
            resilienceScore in 40..70 -> SympatheticColor
            else -> DorsalColor
        }
    }

    val last7Entries = remember(recentEntries) {
        recentEntries.takeLast(7)
    }

    // --- UI ---
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // 1. Section Label
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "İÇGÖRÜ",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
                color = MutedWhite
            )
            Text(
                text = "Geri",
                color = AccentPurple,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clickable { onBack() }
                    .padding(4.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 2. Hero Title
        Text(
            text = heroTitle,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = TitleWhite
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = heroSubtitle,
            fontSize = 14.sp,
            color = BodyWhite
        )

        Spacer(modifier = Modifier.height(24.dp))

        // 3. Resilience Score Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, GlassCardShape),
            colors = CardDefaults.cardColors(containerColor = GlassCardBg),
            shape = GlassCardShape
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "DAYANIKLILIK SKORU",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                    color = MutedWhite
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "$resilienceScore",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Light,
                    color = TitleWhite
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Progress bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .background(
                            Color.White.copy(alpha = 0.08f),
                            RoundedCornerShape(3.dp)
                        )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(resilienceScore / 100f)
                            .fillMaxHeight()
                            .background(resilienceBarColor, RoundedCornerShape(3.dp))
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = resilienceLabel,
                    fontSize = 12.sp,
                    color = resilienceBarColor
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 4. Vagal Triangle (Macro)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, GlassCardShape),
            colors = CardDefaults.cardColors(containerColor = GlassCardBg),
            shape = GlassCardShape
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "VAGAL ÜÇGEN",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                    color = MutedWhite,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val width = size.width
                        val height = size.height

                        // Vertex points
                        val topVertex = Offset(width / 2, 24f)
                        val bottomLeft = Offset(32f, height - 24f)
                        val bottomRight = Offset(width - 32f, height - 24f)

                        // Draw triangle outline
                        val trianglePath = Path().apply {
                            moveTo(topVertex.x, topVertex.y)
                            lineTo(bottomLeft.x, bottomLeft.y)
                            lineTo(bottomRight.x, bottomRight.y)
                            close()
                        }
                        drawPath(
                            path = trianglePath,
                            color = Color.White.copy(alpha = 0.15f),
                            style = Stroke(width = 2f)
                        )

                        // Vertex dots
                        drawCircle(color = VentralColor, radius = 5f, center = topVertex)
                        drawCircle(color = SympatheticColor, radius = 5f, center = bottomLeft)
                        drawCircle(color = DorsalColor, radius = 5f, center = bottomRight)

                        // Calculate average position from entries using barycentric coordinates
                        val vRatio = (stateCounts["ventral"] ?: 0).toFloat() / totalEntries
                        val sRatio = (stateCounts["sympathetic"] ?: 0).toFloat() / totalEntries
                        val dRatio = (stateCounts["dorsal"] ?: 0).toFloat() / totalEntries

                        val avgX = topVertex.x * vRatio + bottomLeft.x * sRatio + bottomRight.x * dRatio
                        val avgY = topVertex.y * vRatio + bottomLeft.y * sRatio + bottomRight.y * dRatio

                        val blobCenter = if (recentEntries.isEmpty()) {
                            Offset(width / 2, height / 2)
                        } else {
                            Offset(avgX, avgY)
                        }

                        // Determine blob color from dominant state
                        val blobColor = when (dominantState) {
                            "ventral" -> VentralColor
                            "sympathetic" -> SympatheticColor
                            else -> DorsalColor
                        }

                        // Outer glow ring
                        drawCircle(
                            color = blobColor.copy(alpha = 0.25f),
                            radius = 22f,
                            center = blobCenter,
                            style = Stroke(width = 2f)
                        )
                        // Inner blob dot
                        drawCircle(
                            color = blobColor,
                            radius = 10f,
                            center = blobCenter
                        )
                    }

                    // Vertex labels overlaid
                    Box(modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = "Ventral",
                            color = VentralColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 0.dp)
                        )
                        Text(
                            text = "Sempatik",
                            color = SympatheticColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(bottom = 0.dp)
                        )
                        Text(
                            text = "Dorsal",
                            color = DorsalColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(bottom = 0.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 5. Energy Path — Last 7 days
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, GlassCardShape),
            colors = CardDefaults.cardColors(containerColor = GlassCardBg),
            shape = GlassCardShape
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "ENERJİ YOLU — Son 7 Gün",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                    color = MutedWhite
                )

                Spacer(modifier = Modifier.height(16.dp))

                if (last7Entries.size < 2) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Henüz yeterli veri yok",
                            fontSize = 14.sp,
                            color = MutedWhite,
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                    ) {
                        val width = size.width
                        val height = size.height
                        val paddingH = 16f
                        val paddingV = 12f
                        val chartWidth = width - paddingH * 2
                        val chartHeight = height - paddingV * 2

                        val points = last7Entries.mapIndexed { index, entry ->
                            val x = paddingH + (chartWidth * index / (last7Entries.size - 1).coerceAtLeast(1))
                            val valence = entry.preValence.coerceIn(0f, 1f)
                            val y = paddingV + chartHeight * (1f - valence)
                            Offset(x, y)
                        }

                        // Draw line path
                        if (points.size >= 2) {
                            val linePath = Path().apply {
                                moveTo(points.first().x, points.first().y)
                                for (i in 1 until points.size) {
                                    lineTo(points[i].x, points[i].y)
                                }
                            }
                            drawPath(
                                path = linePath,
                                color = AccentPurple,
                                style = Stroke(
                                    width = 3f,
                                    cap = StrokeCap.Round,
                                    join = StrokeJoin.Round
                                )
                            )
                        }

                        // Draw data point dots
                        points.forEach { point ->
                            drawCircle(
                                color = AccentPurple,
                                radius = 5f,
                                center = point
                            )
                            drawCircle(
                                color = Color.White.copy(alpha = 0.3f),
                                radius = 8f,
                                center = point,
                                style = Stroke(width = 1.5f)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 6. Weekly State Distribution
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, GlassCardShape),
            colors = CardDefaults.cardColors(containerColor = GlassCardBg),
            shape = GlassCardShape
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "HAFTALIK DURUM DAĞILIMI",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                    color = MutedWhite
                )

                Spacer(modifier = Modifier.height(16.dp))

                val stateItems = listOf(
                    Triple("Ventral", VentralColor, stateCounts["ventral"] ?: 0),
                    Triple("Sempatik", SympatheticColor, stateCounts["sympathetic"] ?: 0),
                    Triple("Dorsal", DorsalColor, stateCounts["dorsal"] ?: 0)
                )

                stateItems.forEach { (label, color, count) ->
                    val percentage = if (totalEntries > 0) (count.toFloat() / totalEntries * 100).toInt() else 0
                    val fraction = if (totalEntries > 0) count.toFloat() / totalEntries else 0f

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = color
                            )
                            Text(
                                text = "%$percentage",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = TitleWhite
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Horizontal bar
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .background(
                                    Color.White.copy(alpha = 0.06f),
                                    RoundedCornerShape(4.dp)
                                )
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(fraction)
                                    .fillMaxHeight()
                                    .background(color, RoundedCornerShape(4.dp))
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(48.dp))
    }
}
