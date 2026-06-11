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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info

data class BreathingPhase(
    val name: String,
    val durationMs: Int,
    val scaleTarget: Float
)

data class BreathingProtocol(
    val id: String,
    val title: String,
    val description: String,
    val phases: List<BreathingPhase>,
    val color: Color,
    val category: String = "calm", // "calm", "focus", "energize"
    val durationLabel: String = "~2 dk",
    val tagline: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BreathingScreen(
    onBack: () -> Unit,
    initialProtocolId: String? = null
) {
    var activeInfoKey by remember { mutableStateOf<String?>(null) }

    val protocols = remember {
        listOf(
            BreathingProtocol(
                id = "p_478", title = "4-7-8 Rahatlatıcı Nefes",
                description = "Derin sakinleşme ve uyku öncesi regülasyon için idealdir. Uzun nefes veriş parasempatik sistemi aktive eder.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 4000, 1.5f),
                    BreathingPhase("Tut", 7000, 1.5f),
                    BreathingPhase("Nefes Ver", 8000, 1.0f)
                ),
                color = Color(0xFF64E49F), category = "calm", durationLabel = "~2 dk",
                tagline = "Derin sakinleşme ve uyku öncesi"
            ),
            BreathingProtocol(
                id = "p_sigh", title = "Derin İç Çekiş",
                description = "Soğutucu nefes ile anlık rahatlama. Uzun veriş CO2 seviyesini düşürür ve vagus sinirini uyarır.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 4000, 1.4f),
                    BreathingPhase("Nefes Ver", 8000, 1.0f)
                ),
                color = Color(0xFF64E49F), category = "calm", durationLabel = "2 dk",
                tagline = "Soğutucu nefes ile anlık rahatlama"
            ),
            BreathingProtocol(
                id = "p_bellows", title = "Enerji Körüğü",
                description = "Bedeni uyandıran hızlı nefes. Hızlı nefesler CO2'yi artırarak kalbi hızlandırır ve sempatik tonu yükseltir.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 2000, 1.4f),
                    BreathingPhase("Nefes Ver", 2000, 1.0f)
                ),
                color = Color(0xFFFBA044), category = "energize", durationLabel = "1.5 dk",
                tagline = "Bedeni uyandıran hızlı nefes"
            ),
            BreathingProtocol(
                id = "p_resonance", title = "Rezonans Frekansı",
                description = "HRV'yi optimize eden denge nefesi. 5.5 saniyelik simetrik nefes kalp ile beyni senkronize eder.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 5500, 1.5f),
                    BreathingPhase("Nefes Ver", 5500, 1.0f)
                ),
                color = Color(0xFF858DFF), category = "focus", durationLabel = "~2 dk",
                tagline = "HRV'yi optimize eden denge nefesi"
            ),
            BreathingProtocol(
                id = "p_grounding", title = "Topraklama Nefesi",
                description = "Güvenli bağlantı ve yerleşme. Derin karın nefesi ile diyafram aracılığıyla vagal tonu artırır.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 4000, 1.4f),
                    BreathingPhase("Nefes Ver", 6000, 1.0f)
                ),
                color = Color(0xFF64E49F), category = "calm", durationLabel = "2 dk",
                tagline = "Güvenli bağlantı ve yerleşme"
            ),
            BreathingProtocol(
                id = "p_phys_sigh", title = "Fizyolojik İç Çekiş",
                description = "Stanford araştırmasıyla kanıtlanmış en hızlı sakinleşme tekniği. Çift nefes alış + uzun veriş.",
                phases = listOf(
                    BreathingPhase("Hızlı Al", 2000, 1.3f),
                    BreathingPhase("Üstüne Al", 1000, 1.5f),
                    BreathingPhase("Uzun Ver", 6000, 1.0f)
                ),
                color = Color(0xFF64E49F), category = "calm", durationLabel = "1 dk",
                tagline = "Stanford araştırmasıyla kanıtlanmış"
            ),
            BreathingProtocol(
                id = "p_coherent", title = "Koherent Nefes",
                description = "Kalp-beyin senkronizasyonu. 5.5 saniyelik simetrik nefes ile kardiyak koherans sağlar.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 5500, 1.5f),
                    BreathingPhase("Nefes Ver", 5500, 1.0f)
                ),
                color = Color(0xFF858DFF), category = "focus", durationLabel = "5 dk",
                tagline = "Kalp-beyin senkronizasyonu"
            ),
            BreathingProtocol(
                id = "p_ext_exhale", title = "Uzatılmış Veriş (4-8)",
                description = "Parasempatik aktivasyon. Nefes verişi alışın 2 katı uzunlukta tutarak vagal tonu artırır.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 4000, 1.4f),
                    BreathingPhase("Nefes Ver", 8000, 1.0f)
                ),
                color = Color(0xFF64E49F), category = "calm", durationLabel = "2 dk",
                tagline = "Parasempatik aktivasyon"
            ),
            BreathingProtocol(
                id = "p_cyclic_sigh", title = "Döngüsel İç Çekiş",
                description = "Huberman Lab protokolü. Çift nefes alış + uzatılmış nefes veriş döngüsü.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 3000, 1.3f),
                    BreathingPhase("Üstüne Al", 1000, 1.5f),
                    BreathingPhase("Uzun Ver", 8000, 1.0f)
                ),
                color = Color(0xFF64E49F), category = "calm", durationLabel = "5 dk",
                tagline = "Huberman Lab protokolü"
            ),
            BreathingProtocol(
                id = "p_fire", title = "Ateş Nefesi",
                description = "Kapalı sistemi uyandıran pranayama. Çok hızlı ritimle sempatik sistemi aktive eder.",
                phases = listOf(
                    BreathingPhase("Al!", 500, 1.3f),
                    BreathingPhase("Ver!", 500, 1.0f)
                ),
                color = Color(0xFFFBA044), category = "energize", durationLabel = "2 dk",
                tagline = "Kapalı sistemi uyandıran pranayama"
            ),
            BreathingProtocol(
                id = "p_nadi", title = "Nadi Shodhana",
                description = "Sağ-sol beyin dengesi. Alternatif burun nefesi ile hemisfer senkronizasyonu sağlar.",
                phases = listOf(
                    BreathingPhase("Sol Al", 4000, 1.4f),
                    BreathingPhase("Sağ Ver", 4000, 1.0f),
                    BreathingPhase("Sağ Al", 4000, 1.4f),
                    BreathingPhase("Sol Ver", 4000, 1.0f)
                ),
                color = Color(0xFF858DFF), category = "focus", durationLabel = "4 dk",
                tagline = "Sağ-sol beyin dengesi"
            ),
            BreathingProtocol(
                id = "p_box", title = "Kutu Nefesi",
                description = "Navy SEAL odaklanma tekniği. Eşit süreli 4 fazlı nefes ile zihinsel berraklık sağlar.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 4000, 1.5f),
                    BreathingPhase("Tut", 4000, 1.5f),
                    BreathingPhase("Nefes Ver", 4000, 1.0f),
                    BreathingPhase("Boşta Tut", 4000, 1.0f)
                ),
                color = Color(0xFF858DFF), category = "focus", durationLabel = "2 dk",
                tagline = "Navy SEAL odaklanma tekniği"
            )
        )
    }

    var selectedProtocol by remember {
        mutableStateOf(initialProtocolId?.let { id -> protocols.find { it.id == id } })
    }
    var isRunning by remember { mutableStateOf(initialProtocolId != null) }
    var currentPhaseIndex by remember { mutableIntStateOf(0) }
    var phaseProgress by remember { mutableFloatStateOf(0f) }
    var cycleCount by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val animScale = remember { Animatable(1.0f) }

    if (isRunning && selectedProtocol != null) {
        val protocol = selectedProtocol!!
        val currentPhase = protocol.phases[currentPhaseIndex]

        LaunchedEffect(currentPhaseIndex) {
            animScale.animateTo(
                targetValue = currentPhase.scaleTarget,
                animationSpec = tween(
                    durationMillis = currentPhase.durationMs,
                    easing = LinearOutSlowInEasing
                )
            )
        }

        LaunchedEffect(currentPhaseIndex) {
            val totalSteps = 100
            val stepDuration = currentPhase.durationMs / totalSteps
            for (i in 0..totalSteps) {
                phaseProgress = i / 100f
                delay(stepDuration.toLong())
            }
            val nextIndex = (currentPhaseIndex + 1) % protocol.phases.size
            if (nextIndex == 0) cycleCount++
            currentPhaseIndex = nextIndex
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Transparent)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = protocol.title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                if (cycleCount > 0) {
                    Text(
                        text = "Tur $cycleCount",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.4f),
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }

            // Animated Breathing Circle
            Box(
                modifier = Modifier.size(300.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(180.dp)
                        .scale(animScale.value)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    protocol.color.copy(alpha = 0.3f),
                                    Color.Transparent
                                )
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .scale(animScale.value)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    protocol.color.copy(alpha = 0.6f),
                                    protocol.color.copy(alpha = 0.2f)
                                )
                            )
                        )
                        .border(2.dp, protocol.color.copy(alpha = 0.8f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = currentPhase.name,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Phase description
                Text(
                    text = protocol.description,
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 32.dp, vertical = 8.dp)
                )

                LinearProgressIndicator(
                    progress = { phaseProgress },
                    modifier = Modifier
                        .fillMaxWidth(0.8f)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = protocol.color,
                    trackColor = Color.White.copy(alpha = 0.08f),
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        isRunning = false
                        currentPhaseIndex = 0
                        phaseProgress = 0f
                        cycleCount = 0
                        scope.launch { animScale.snapTo(1.0f) }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f)),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Egzersizi Durdur", color = Color.White)
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }

    } else {
        // Selection Layout
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Transparent)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Nefes Egzersizleri",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = { activeInfoKey = "meditations" }) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Bilgi",
                        tint = Color.White.copy(alpha = 0.4f)
                    )
                }
            }
            Text(
                text = "Sinir sistemini regüle etmek için kanıta dayalı teknikler",
                fontSize = 14.sp,
                color = Color.White.copy(alpha = 0.6f),
                modifier = Modifier.padding(bottom = 20.dp)
            )

            // Filter chips
            var selectedFilter by remember { mutableStateOf("all") }
            val filters = listOf("all" to "Tümü", "calm" to "Sakinlik", "focus" to "Odak", "energize" to "Enerji")

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                filters.forEach { (key, label) ->
                    val isActive = selectedFilter == key
                    val chipColor = when (key) {
                        "calm" -> Color(0xFF64E49F)
                        "focus" -> Color(0xFF858DFF)
                        "energize" -> Color(0xFFFBA044)
                        else -> Color(0xFF858DFF)
                    }
                    Card(
                        modifier = Modifier
                            .clickable { selectedFilter = key }
                            .border(
                                1.dp,
                                if (isActive) chipColor else Color.White.copy(alpha = 0.08f),
                                RoundedCornerShape(100.dp)
                            ),
                        shape = RoundedCornerShape(100.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isActive) chipColor.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.04f)
                        )
                    ) {
                        Text(
                            text = label,
                            color = if (isActive) chipColor else Color.White.copy(alpha = 0.6f),
                            fontSize = 13.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                }
            }

            // Protocol cards
            val filtered = if (selectedFilter == "all") protocols else protocols.filter { it.category == selectedFilter }

            filtered.forEach { protocol ->
                val catColor = when (protocol.category) {
                    "calm" -> Color(0xFF64E49F)
                    "focus" -> Color(0xFF858DFF)
                    "energize" -> Color(0xFFFBA044)
                    else -> Color.White
                }
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp))
                        .clickable {
                            selectedProtocol = protocol
                            isRunning = true
                            currentPhaseIndex = 0
                            phaseProgress = 0f
                            cycleCount = 0
                        },
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(catColor)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = protocol.title,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    fontSize = 15.sp
                                )
                            }
                            Text(
                                text = protocol.durationLabel,
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = protocol.tagline,
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 13.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    activeInfoKey?.let { key ->
        AuraInfoDialog(infoKey = key) {
            activeInfoKey = null
        }
    }
}
