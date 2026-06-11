package com.aura.wellness.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DashboardScreen(
    lastState: String?,
    recentEntries: List<CheckinEntry>,
    showNotebook: Boolean,
    showFocus: Boolean,
    showAmbient: Boolean,
    showSleep: Boolean,
    unlockedFocus: Boolean,
    unlockedAmbient: Boolean,
    unlockedSleep: Boolean,
    onToggleModule: (String) -> Unit,
    onNavigateToCheckin: () -> Unit,
    onNavigateToBreathing: () -> Unit,
    onNavigateToNotebook: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToSOS: () -> Unit,
    onNavigateToInsight: () -> Unit,
    onNavigateToMeditations: () -> Unit
) {
    val scrollState = rememberScrollState()
    var activeInfoKey by remember { mutableStateOf<String?>(null) }
    val dayOfYear = remember { Calendar.getInstance().get(Calendar.DAY_OF_YEAR) }
    val hourOfDay = remember { Calendar.getInstance().get(Calendar.HOUR_OF_DAY) }

    val greeting = when (hourOfDay) {
        in 5..11 -> "Günaydın"
        in 12..17 -> "İyi öğlenler"
        in 18..22 -> "İyi akşamlar"
        else -> "İyi geceler"
    }

    val intents = remember {
        listOf(
            "Bugün bedenime şefkat göstereceğim.",
            "Bir sinyal fark ettiğimde durup nefes alacağım.",
            "Kendimi yargılamadan gözlemleyeceğim.",
            "Güvenli hissettiğim bir anı fark edeceğim.",
            "Bugün bir şeyi bırakacağım."
        )
    }
    val dailyIntent = intents[dayOfYear % intents.size]

    val scienceBites = remember {
        listOf(
            "Sempatik uyarılma anlarında nefes verme süresini uzatmak parasempatik sinir sistemini aktif hale getirir.",
            "Vagus siniri, beyin ile bağırsak arasında iki yönlü iletişim sağlar.",
            "Polyvagal teoriye göre güvenlik hissi, ventral vagal sistemin aktif olmasıyla ilişkilidir.",
            "Dorsal vagal tepki, hayatta kalmak için enerji tasarrufu yapar — donma veya çöküş olarak hissedilir.",
            "Sempatik sinir sistemi tehlike algıladığında kalp hızını, nefes hızını ve kas gerginliğini artırır.",
            "Ko-regülasyon, başka bir insanın varlığının sinir sistemini sakinleştirmesidir.",
            "HRV (kalp hızı değişkenliği), vagal tonun en güvenilir göstergesidir.",
            "Diyafram nefesi vagus sinirini mekanik olarak uyarır ve parasempatik yanıtı başlatır.",
            "Yüz ifadeleri ve ses tonu, sosyal sinir sistemi aracılığıyla karşıdaki kişinin vagal tonunu etkiler.",
            "Kronik stres, sempatik sistemin sürekli aktif kalmasına ve vagal tonun düşmesine neden olur.",
            "'Window of tolerance' — sinir sistemi bu pencere içindeyken regülasyon mümkündür.",
            "Fizyolojik iç çekiş (double inhale + long exhale) en hızlı sakinleşme yöntemidir.",
            "Soğuk su yüze uygulandığında dalış refleksi aktive olur ve kalp hızı düşer.",
            "Bedensel farkındalık (interoception), duygusal regülasyonun temelini oluşturur.",
            "Ventral vagal durum, bağlanma, merak ve şefkatin fizyolojik temelidir."
        )
    }
    val dailyScienceBite = scienceBites[dayOfYear % scienceBites.size]

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // 1. Dynamic Greeting
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "$greeting,",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = "Bugün sinir sistemin nasıl?",
                fontSize = 14.sp,
                color = Color.White.copy(alpha = 0.6f)
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 2. Check-in CTA Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "PROTOKOL",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                    color = Color.White.copy(alpha = 0.4f)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onNavigateToCheckin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color.Black
                    ),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text(
                        text = "Check-in'e Başla",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Sana ayrılmış 3-5 dakika",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.5f)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 3. SOS Quick Button
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    1.dp,
                    Color.White.copy(alpha = 0.08f),
                    RoundedCornerShape(24.dp)
                )
                .clickable { onNavigateToSOS() },
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        drawRect(
                            color = Color(0xFFFBA044),
                            size = size.copy(width = 4.dp.toPx())
                        )
                    }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Sadece 1 Dakika (SOS)",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 15.sp
                    )
                    Text(
                        text = "4-7-8 nefes ile anında sakinleş",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.5f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Nefes Kütüphanesi CTA
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    1.dp,
                    Color.White.copy(alpha = 0.08f),
                    RoundedCornerShape(24.dp)
                )
                .clickable { onNavigateToMeditations() },
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        drawRect(
                            color = Color(0xFF858DFF),
                            size = size.copy(width = 4.dp.toPx())
                        )
                    }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Nefes Kütüphanesi",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 15.sp
                    )
                    Text(
                        text = "12 farklı vagal düzenleme tekniği",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.5f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 4. Daily Intent Card
        Text(
            text = "GÜNÜN NİYETİ",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f),
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.06f),
                                Color.White.copy(alpha = 0.01f)
                            )
                        )
                    )
                    .padding(16.dp)
            ) {
                Text(
                    text = dailyIntent,
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 5. Nervous System Note
        Text(
            text = "SİNİR SİSTEMİ NOTU",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            color = Color.White.copy(alpha = 0.4f),
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = dailyScienceBite,
                    color = Color.White.copy(alpha = 0.75f),
                    fontSize = 14.sp,
                    lineHeight = 22.sp
                )
            }
        }

        // 6. Weekly Timeline (if entries exist)
        if (recentEntries.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "HAFTALIK ÖRÜNTÜ",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
                color = Color.White.copy(alpha = 0.4f),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Let's draw 7 days.
                    // Group entries by day of week.
                    val calendar = Calendar.getInstance()
                    val dayMap = remember(recentEntries) {
                        val map = mutableMapOf<Int, String>()
                        recentEntries.forEach { entry ->
                            calendar.timeInMillis = entry.timestamp
                            val day = calendar.get(Calendar.DAY_OF_WEEK) // 1=Sunday, 2=Monday...
                            // Store the dominant state
                            map[day] = entry.state
                        }
                        map
                    }

                    val daysOfWeek = listOf(
                        Calendar.MONDAY to "Pzt",
                        Calendar.TUESDAY to "Sal",
                        Calendar.WEDNESDAY to "Çar",
                        Calendar.THURSDAY to "Per",
                        Calendar.FRIDAY to "Cum",
                        Calendar.SATURDAY to "Cmt",
                        Calendar.SUNDAY to "Paz"
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        daysOfWeek.forEach { (dayConstant, label) ->
                            val state = dayMap[dayConstant]
                            val dotColor = when (state) {
                                "ventral" -> Color(0xFF64E49F)
                                "sympathetic" -> Color(0xFFFBA044)
                                "dorsal" -> Color(0xFF62A4FF)
                                else -> Color.White.copy(alpha = 0.1f)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .clip(CircleShape)
                                        .background(dotColor)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.5f)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 7. Resilience/Plasticity Bar (if 3+ entries)
        if (recentEntries.size >= 3) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "DAYANIKLILIK",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
                color = Color.White.copy(alpha = 0.4f),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    val ventralCount = recentEntries.count { it.state == "ventral" }
                    val score = (ventralCount.toFloat() / recentEntries.size * 100).toInt()
                    val progressColor = when {
                        score > 70 -> Color(0xFF64E49F)
                        score in 40..70 -> Color(0xFFFBA044)
                        else -> Color(0xFF62A4FF)
                    }
                    val scoreLabel = when {
                        score > 70 -> "Yüksek Plastisite"
                        score in 40..70 -> "Orta Düzey"
                        else -> "Dikkat Gerekli"
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = scoreLabel,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "%$score",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Light,
                            color = Color.White
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { score / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = progressColor,
                        trackColor = Color.White.copy(alpha = 0.1f)
                    )
                }
            }
        }

        // 8. Compassion Messages (if 3+ recent entries all sympathetic or all dorsal)
        if (recentEntries.size >= 3) {
            val lastThree = recentEntries.take(3)
            val allSympathetic = lastThree.all { it.state == "sympathetic" }
            val allDorsal = lastThree.all { it.state == "dorsal" }

            if (allSympathetic || allDorsal) {
                Spacer(modifier = Modifier.height(16.dp))
                val messageText = if (allSympathetic) {
                    "Son günlerde sinir sistemin çok çalıştı. Ona biraz daha şefkat göster."
                } else {
                    "Bedenin sana dinlenme sinyali gönderiyor. Bu normal ve geçici."
                }
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .drawBehind {
                                drawRect(
                                    color = if (allSympathetic) Color(0xFFFBA044) else Color(0xFF62A4FF),
                                    size = size.copy(width = 4.dp.toPx())
                                )
                            }
                            .padding(16.dp)
                    ) {
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = messageText,
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 13.sp,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 9. Vagal Triangle Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Vagal Durum Üçgeni",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    IconButton(
                        onClick = { activeInfoKey = "vagal_analysis" },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "Bilgi",
                            tint = Color.White.copy(alpha = 0.5f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))

                Box(
                    modifier = Modifier
                        .size(200.dp)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val width = size.width
                        val height = size.height

                        val top = Offset(width / 2, 20f)
                        val bottomLeft = Offset(40f, height - 20f)
                        val bottomRight = Offset(width - 40f, height - 20f)

                        val path = Path().apply {
                            moveTo(top.x, top.y)
                            lineTo(bottomLeft.x, bottomLeft.y)
                            lineTo(bottomRight.x, bottomRight.y)
                            close()
                        }
                        drawPath(
                            path = path,
                            color = Color.White.copy(alpha = 0.15f),
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f)
                        )

                        val dotPosition = when (lastState) {
                            "ventral" -> top
                            "sympathetic" -> bottomLeft
                            "dorsal" -> bottomRight
                            else -> Offset(width / 2, height / 2 + 10f)
                        }

                        drawCircle(
                            color = when (lastState) {
                                "ventral" -> Color(0xFF64E49F)
                                "sympathetic" -> Color(0xFFFBA044)
                                "dorsal" -> Color(0xFF62A4FF)
                                else -> Color.White
                            },
                            radius = 12f,
                            center = dotPosition
                        )

                        drawCircle(
                            color = Color.White.copy(alpha = 0.3f),
                            radius = 22f,
                            center = dotPosition,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2f)
                        )
                    }

                    Box(modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = "Ventral (Güvenli)",
                            color = Color(0xFF64E49F),
                            fontSize = 10.sp,
                            modifier = Modifier.align(Alignment.TopCenter)
                        )
                        Text(
                            text = "Sempatik (Savaş/Kaç)",
                            color = Color(0xFFFBA044),
                            fontSize = 10.sp,
                            modifier = Modifier.align(Alignment.BottomStart)
                        )
                        Text(
                            text = "Dorsal (Don/Çök)",
                            color = Color(0xFF62A4FF),
                            fontSize = 10.sp,
                            modifier = Modifier.align(Alignment.BottomEnd)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Detaylı Nöral Analiz →",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF858DFF),
                    modifier = Modifier
                        .clickable { onNavigateToInsight() }
                        .padding(8.dp)
                )
            }
        }

        // 10. Recent Moments
        if (recentEntries.isNotEmpty()) {
            Spacer(modifier = Modifier.height(24.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Son Check-in Kayıtları",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Tümü",
                    color = Color(0xFF858DFF),
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onNavigateToNotebook() }
                )
            }

            val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy, HH:mm", Locale("tr")) }

            recentEntries.take(5).forEach { entry ->
                val stateColor = when (entry.state) {
                    "ventral" -> Color(0xFF64E49F)
                    "sympathetic" -> Color(0xFFFBA044)
                    "dorsal" -> Color(0xFF62A4FF)
                    else -> Color.White
                }
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(stateColor)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = when (entry.state) {
                                        "ventral" -> "Ventral"
                                        "sympathetic" -> "Sempatik"
                                        else -> "Dorsal"
                                    },
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = dateFormatter.format(Date(entry.timestamp)),
                                    color = Color.White.copy(alpha = 0.4f),
                                    fontSize = 11.sp
                                )
                            }
                        }

                        // Render emotions
                        if (entry.emotions.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            FlowRow(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                entry.emotions.forEach { emotion ->
                                    Box(
                                        modifier = Modifier
                                            .border(1.dp, stateColor.copy(alpha = 0.3f), RoundedCornerShape(100.dp))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = emotion,
                                            color = stateColor,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }
                        }

                        // Render somatic tags (max 2)
                        if (entry.somaticKeys.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            FlowRow(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                entry.somaticKeys.take(2).forEach { key ->
                                    Box(
                                        modifier = Modifier
                                            .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(100.dp))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = key,
                                            color = Color.White.copy(alpha = 0.5f),
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }
                        }

                        if (entry.note.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = entry.note,
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 13.sp,
                                maxLines = 2
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 11. Aura+ Module Market
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Aura+",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.width(6.dp))
            IconButton(
                onClick = { activeInfoKey = "insight" },
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Bilgi",
                    tint = Color.White.copy(alpha = 0.5f),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Text(
            text = "Genişletilmiş araçları keşfet ve sistemine ekle.",
            fontSize = 13.sp,
            color = Color.White.copy(alpha = 0.5f),
            modifier = Modifier.padding(bottom = 16.dp)
        )

        val modules = listOf(
            ModuleItem("notebook", "Notebook", "Somatik günlük kayıtları ve geçmişi.", true, showNotebook, Color(0xFF858DFF)),
            ModuleItem("focus", "Focus Series", "Odaklanma süreleri için sayaç ve yapılacaklar listesi.", unlockedFocus, showFocus, Color(0xFF858DFF)),
            ModuleItem("ambient", "Ambient Space", "Rahatlatıcı doğa sesleri ve dalgaları.", unlockedAmbient, showAmbient, Color(0xFF62A4FF)),
            ModuleItem("sleep", "Deep Sleep", "Derin uyku için Silent Coach uyku ritüeli.", unlockedSleep, showSleep, Color(0xFF64E49F))
        )

        modules.forEach { mod ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
                    .border(
                        1.dp,
                        if (mod.isActive) mod.accentColor.copy(alpha = 0.4f) else Color.White.copy(alpha = 0.05f),
                        RoundedCornerShape(24.dp)
                    ),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = mod.title,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 16.sp
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (!mod.isInstalled) "KİLİTLİ (Aura+ Gerekli)" else if (mod.isActive) "AKTİF" else "PASİF",
                                fontSize = 10.sp,
                                color = if (mod.isActive) mod.accentColor else Color.White.copy(alpha = 0.5f),
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                              )
                        }

                        Button(
                            onClick = { onToggleModule(mod.id) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (!mod.isInstalled) Color.White.copy(alpha = 0.1f)
                                                 else if (mod.isActive) Color.White.copy(alpha = 0.05f)
                                                 else mod.accentColor.copy(alpha = 0.2f)
                            ),
                            shape = RoundedCornerShape(20.dp),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (!mod.isInstalled) Color.White.copy(alpha = 0.2f)
                                else if (mod.isActive) Color.White.copy(alpha = 0.15f)
                                else mod.accentColor.copy(alpha = 0.4f)
                            )
                        ) {
                            Text(
                                text = if (!mod.isInstalled) "Yükle" else if (mod.isActive) "Kapat" else "Aç",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = mod.description,
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 13.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(48.dp))
    }

    activeInfoKey?.let { key ->
        AuraInfoDialog(infoKey = key) {
            activeInfoKey = null
        }
    }
}

private data class ModuleItem(
    val id: String,
    val title: String,
    val description: String,
    val isInstalled: Boolean,
    val isActive: Boolean,
    val accentColor: Color
)
