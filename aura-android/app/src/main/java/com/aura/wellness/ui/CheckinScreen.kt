package com.aura.wellness.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Calendar

enum class CheckinStep {
    MORNING_CHECKIN,
    SOMATIC_ENTRY,
    AFFECT_GRID,
    EMOTION_REFINEMENT,
    MEDITATION_LOADING,
    EXERCISE,
    SAVORING_PROMPT,
    SAVORING_NOTE,
    COMPLETION
}

data class SomaticOption(
    val key: String,
    val text: String,
    val state: String,
    val a: Float,
    val v: Float
)

@Composable
fun CheckinHUD(
    step: CheckinStep,
    isNextEnabled: Boolean,
    onNext: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val mode = when (step) {
        CheckinStep.MORNING_CHECKIN -> "arrow"
        CheckinStep.SOMATIC_ENTRY -> "arrow"
        CheckinStep.AFFECT_GRID -> "arrow"
        CheckinStep.EMOTION_REFINEMENT -> "arrow"
        CheckinStep.EXERCISE -> "skip"
        CheckinStep.SAVORING_PROMPT -> "arrow"
        CheckinStep.SAVORING_NOTE -> "check"
        CheckinStep.COMPLETION -> "home"
        else -> "arrow"
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 24.dp, top = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Glassmorphic HUD circular button
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(
                        if (isNextEnabled) Color.White.copy(alpha = 0.08f)
                        else Color.White.copy(alpha = 0.02f)
                    )
                    .border(
                        1.dp,
                        if (isNextEnabled) Color.White.copy(alpha = 0.2f)
                        else Color.White.copy(alpha = 0.05f),
                        CircleShape
                    )
                    .clickable(enabled = isNextEnabled) { onNext() },
                contentAlignment = Alignment.Center
            ) {
                when (mode) {
                    "arrow" -> {
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = "Devam Et",
                            tint = if (isNextEnabled) Color.White else Color.White.copy(alpha = 0.3f),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    "check" -> {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Tamamla",
                            tint = if (isNextEnabled) Color.White else Color.White.copy(alpha = 0.3f),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    "skip" -> {
                        Icon(
                            imageVector = Icons.Default.FastForward,
                            contentDescription = "Geç",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    "home" -> {
                        Icon(
                            imageVector = Icons.Default.Home,
                            contentDescription = "Keşfet'e Dön",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = if (step == CheckinStep.COMPLETION) "Tamamlandı" else "Geri Dön",
            color = Color.White.copy(alpha = 0.4f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clickable(enabled = step != CheckinStep.COMPLETION) { onBack() }
                .padding(4.dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun CheckinScreen(
    recentEntries: List<CheckinEntry> = emptyList(),
    onCompleteCheckin: (entry: CheckinEntry) -> Unit,
    onBack: () -> Unit
) {
    // 24 Somatic options from translations.js
    val somaticOptions = remember {
        listOf(
            SomaticOption("bs_ventral_shoulders", "Omuzlarım rahat / aşağıda", "ventral", 0.3f, 0.8f),
            SomaticOption("bs_ventral_belly", "Nefes alınca karnım yükseliyor", "ventral", 0.4f, 0.8f),
            SomaticOption("bs_ventral_settling", "İçimde sakin bir durgunluk var", "ventral", 0.3f, 0.7f),
            SomaticOption("bs_ventral_belong", "Buradayım ve bedenimi hissediyorum", "ventral", 0.4f, 0.9f),
            SomaticOption("bs_ventral_jaw", "Yüzüm ve çenem gevşek", "ventral", 0.3f, 0.8f),
            
            SomaticOption("bs_symp_jaw", "Çenemi sıkıyorum (farkında olmadan)", "sympathetic", 0.8f, 0.4f),
            SomaticOption("bs_symp_shoulders", "Omuzlarım kulaklarıma yakın", "sympathetic", 0.8f, 0.3f),
            SomaticOption("bs_symp_chest", "Göğsümde bir sıkışma / dar nefes", "sympathetic", 0.7f, 0.3f),
            SomaticOption("bs_symp_hands", "Ellerim soğuk / terli", "sympathetic", 0.7f, 0.4f),
            SomaticOption("bs_symp_legs", "Bacaklarım huzursuz / hareket istiyor", "sympathetic", 0.9f, 0.4f),
            SomaticOption("bs_symp_heart", "Kalbim hızlı / göğsüm gergin", "sympathetic", 0.9f, 0.3f),
            SomaticOption("bs_symp_spring", "Kopmak üzere olan gergin bir yay gibiyim", "sympathetic", 0.8f, 0.4f),
            
            SomaticOption("bs_dorsal_distant", "Her şey uzaktan geliyor / burada değilim", "dorsal", 0.2f, 0.2f),
            SomaticOption("bs_dorsal_heavy", "Bedenim çok ağır, kalkmak zor", "dorsal", 0.2f, 0.3f),
            SomaticOption("bs_dorsal_numb", "Hiçbir şey hissetmiyorum (boşluk)", "dorsal", 0.1f, 0.2f),
            SomaticOption("bs_dorsal_eyes", "Gözlerim ağır (ama uyku değil)", "dorsal", 0.3f, 0.3f),
            SomaticOption("bs_dorsal_vulnerable", "Bir yere yaslanmak / küçülmek istiyorum", "dorsal", 0.3f, 0.2f),
            SomaticOption("bs_dorsal_voice", "Sesim içime kaçmış gibi", "dorsal", 0.2f, 0.4f),
            
            SomaticOption("bs_neutral_deep", "Nefesim derin ve düzenli", "ventral", 0.4f, 0.7f),
            SomaticOption("bs_neutral_weight", "Bedenimde bir ağırlık hissediyorum", "dorsal", 0.3f, 0.4f),
            SomaticOption("bs_neutral_cold", "Ellerim soğuk", "sympathetic", 0.6f, 0.4f),
            SomaticOption("bs_neutral_face", "Yüzümde bir gerginlik var", "sympathetic", 0.7f, 0.4f),
            
            SomaticOption("bs_digest_throat", "Boğazım düğümleniyor", "sympathetic", 0.7f, 0.3f),
            SomaticOption("bs_digest_appetite", "İştahım yok", "dorsal", 0.2f, 0.3f),
            SomaticOption("bs_digest_stomach", "Midem aşırı dolu / şiş", "sympathetic", 0.6f, 0.3f),
            SomaticOption("bs_digest_head", "Başım hafifçe ağrıyor", "sympathetic", 0.7f, 0.4f)
        )
    }

    val emotionsMap = remember {
        mapOf(
            "ventral" to listOf(
                "emo_grateful" to "Minnettar",
                "emo_curious" to "Meraklı",
                "emo_peaceful" to "Huzurlu",
                "emo_joyful" to "Neşeli",
                "emo_compassionate" to "Şefkatli",
                "emo_connected" to "Bağlantıda"
            ),
            "sympathetic" to listOf(
                "emo_anxious" to "Endişeli",
                "emo_angry" to "Sinirli",
                "emo_overwhelmed" to "Bunalmış",
                "emo_excited" to "Heyecanlı",
                "emo_tense" to "Gergin",
                "emo_impatient" to "Sabırsız"
            ),
            "dorsal" to listOf(
                "emo_numb" to "Uyuşmuş",
                "emo_tired" to "Yorgun",
                "emo_sad" to "Mutsuz",
                "emo_empty" to "Boş",
                "emo_hopeless" to "Umutsuz",
                "emo_dull" to "Donuk"
            )
        )
    }

    val marinationOptions = remember {
        listOf(
            "mar_calmer" to "Daha sakin",
            "mar_warmer" to "Daha sıcak",
            "mar_lighter" to "Daha hafif",
            "mar_slower" to "Daha yavaş",
            "mar_clearer" to "Daha berrak",
            "mar_grounded" to "Daha dengeli"
        )
    }

    // Step state flow
    var currentStep by remember {
        val isMorning = Calendar.getInstance().get(Calendar.HOUR_OF_DAY) in 5..11
        val alreadyCheckedInToday = recentEntries.any {
            val entryCal = Calendar.getInstance().apply { timeInMillis = it.timestamp }
            val nowCal = Calendar.getInstance()
            entryCal.get(Calendar.YEAR) == nowCal.get(Calendar.YEAR) &&
                    entryCal.get(Calendar.DAY_OF_YEAR) == nowCal.get(Calendar.DAY_OF_YEAR)
        }
        mutableStateOf(if (isMorning && !alreadyCheckedInToday) CheckinStep.MORNING_CHECKIN else CheckinStep.SOMATIC_ENTRY)
    }

    // Interactive states
    var dreamQuality by remember { mutableStateOf<String?>(null) }
    var awakeningState by remember { mutableStateOf<String?>(null) }
    val somaticSelections = remember { mutableStateListOf<String>() }
    var preValence by remember { mutableStateOf<Float?>(null) }
    var preArousal by remember { mutableStateOf<Float?>(null) }
    var calculatedState by remember { mutableStateOf("ventral") }
    val selectedEmotions = remember { mutableStateListOf<String>() }
    var countdownProgress by remember { mutableFloatStateOf(1.0f) }
    var countdownVal by remember { mutableIntStateOf(5) }
    val marinationSelections = remember { mutableStateListOf<String>() }
    var savoringNoteText by remember { mutableStateOf("") }
    var activeInfoKey by remember { mutableStateOf<String?>(null) }

    // Breathing variables
    var breathingIsRunning by remember { mutableStateOf(true) }
    var breathingPhaseIndex by remember { mutableIntStateOf(0) }
    val breathScale = remember { Animatable(1.0f) }

    val currentProtocol = remember(calculatedState) {
        when (calculatedState) {
            "sympathetic" -> BreathingProtocol(
                id = "p_478",
                title = "4-7-8 Nefesi",
                description = "Kaygı, sempatik sistemi şaha kaldırır. Uzun nefes veriş ona adeta fren yaptırır.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 4000, 1.5f),
                    BreathingPhase("Tut", 7000, 1.5f),
                    BreathingPhase("Nefes Ver", 8000, 1.0f)
                ),
                color = Color(0xFFFBA044)
            )
            "dorsal" -> BreathingProtocol(
                id = "p_bellows",
                title = "Körük Nefesi",
                description = "Uyuşukluk sistemin kapanmasıdır. Hızlı nefesler CO2'yi artırarak kalbi hızlandırır ve bedeni uyandırır.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 2000, 1.4f),
                    BreathingPhase("Nefes Ver", 2000, 1.0f)
                ),
                color = Color(0xFF62A4FF)
            )
            else -> BreathingProtocol(
                id = "p_resonance",
                title = "Rezonans Nefesi",
                description = "Zaten dengedesin. Bu frekans HRV'ni yüksek tutar ve pekiştirir.",
                phases = listOf(
                    BreathingPhase("Nefes Al", 5500, 1.5f),
                    BreathingPhase("Nefes Ver", 5500, 1.0f)
                ),
                color = Color(0xFF64E49F)
            )
        }
    }

    // Auto-advance for loading countdown
    LaunchedEffect(currentStep) {
        if (currentStep == CheckinStep.MEDITATION_LOADING) {
            countdownVal = 5
            countdownProgress = 1.0f
            while (countdownVal > 0) {
                delay(100)
                countdownProgress -= 0.02f
                if (countdownProgress <= 0.0f) {
                    countdownVal--
                    countdownProgress = 1.0f
                }
            }
            currentStep = CheckinStep.EXERCISE
        }
    }

    // Breathing loop
    LaunchedEffect(currentStep, breathingIsRunning, breathingPhaseIndex) {
        if (currentStep == CheckinStep.EXERCISE && breathingIsRunning) {
            val phases = currentProtocol.phases
            val phase = phases[breathingPhaseIndex]
            val duration = phase.durationMs
            val targetScale = phase.scaleTarget
            
            // Animate scale
            breathScale.animateTo(
                targetValue = targetScale,
                animationSpec = tween(durationMillis = duration, easing = LinearOutSlowInEasing)
            )

            // Increment phase
            breathingPhaseIndex = (breathingPhaseIndex + 1) % phases.size
        }
    }

    // Step 5 marination fade delay
    var showMarinationChips by remember { mutableStateOf(false) }
    LaunchedEffect(currentStep) {
        if (currentStep == CheckinStep.SAVORING_PROMPT) {
            showMarinationChips = false
            delay(3500)
            showMarinationChips = true
        }
    }

    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 120.dp)
        ) {
            if (currentStep != CheckinStep.COMPLETION) {
                // Header / Cancel navigation
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "İptal",
                        color = Color.White.copy(alpha = 0.6f),
                        fontWeight = FontWeight.Medium,
                        fontSize = 15.sp,
                        modifier = Modifier
                            .clickable { onBack() }
                            .padding(8.dp)
                    )

                    // Render current step index
                    val stepIndicator = when (currentStep) {
                        CheckinStep.MORNING_CHECKIN -> "Sabah Raporu"
                        CheckinStep.SOMATIC_ENTRY -> "Adım 1 / 6"
                        CheckinStep.AFFECT_GRID -> "Adım 2 / 6"
                        CheckinStep.EMOTION_REFINEMENT -> "Adım 3 / 6"
                        CheckinStep.MEDITATION_LOADING -> "Hazırlık"
                        CheckinStep.EXERCISE -> "Adım 4 / 6"
                        CheckinStep.SAVORING_PROMPT -> "Adım 5 / 6"
                        CheckinStep.SAVORING_NOTE -> "Adım 6 / 6"
                        else -> ""
                    }

                    if (stepIndicator.isNotEmpty()) {
                        Text(
                            text = stepIndicator,
                            color = Color.White.copy(alpha = 0.4f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }

                    Box(modifier = Modifier.size(40.dp)) // Equalizer spacer
                }
            }

            when (currentStep) {
                CheckinStep.MORNING_CHECKIN -> {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Günaydın.",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "Uyku ve rüya kaliten sinir sisteminin temel tonunu belirler.",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp)
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    // Q1
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = "Dün gece rüya gördün mü?",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 16.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("yes" to "Evet", "no" to "Hayır", "vague" to "Hayal Meyal").forEach { (valKey, label) ->
                                    val isSelected = dreamQuality == valKey
                                    Button(
                                        onClick = { dreamQuality = valKey },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isSelected) Color.White.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.05f)
                                        ),
                                        shape = RoundedCornerShape(16.dp),
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) Color.White else Color.White.copy(alpha = 0.1f)
                                        )
                                    ) {
                                        Text(label, color = Color.White, fontSize = 12.sp, maxLines = 1)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Q2
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = "Uyanınca bedenin nasıl hissettirdi?",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 16.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("refreshed" to "Dinlenmiş", "heavy" to "Ağır", "neutral" to "Nötr").forEach { (valKey, label) ->
                                    val isSelected = awakeningState == valKey
                                    Button(
                                        onClick = { awakeningState = valKey },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isSelected) Color.White.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.05f)
                                        ),
                                        shape = RoundedCornerShape(16.dp),
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) Color.White else Color.White.copy(alpha = 0.1f)
                                        )
                                    ) {
                                        Text(label, color = Color.White, fontSize = 12.sp, maxLines = 1)
                                    }
                                }
                            }
                        }
                    }
                }

                CheckinStep.SOMATIC_ENTRY -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Şu an vücudunda ne fark ediyorsun?",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { activeInfoKey = "step1" }) {
                            Icon(Icons.Default.Info, contentDescription = "Bilgi", tint = Color.White.copy(alpha = 0.4f))
                        }
                    }
                    Text(
                        text = "En fazla 3 seçenek belirle.",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                    )

                    // Shuffled chips layout sorted such that selected ones are grouped at the top
                    val sortedOptions = remember(somaticSelections.size) {
                        somaticOptions.sortedWith(compareByDescending<SomaticOption> { 
                            somaticSelections.contains(it.key) 
                        }.thenBy { it.state })
                    }

                    // Render in custom Flow Layout (using standard FlowRow in Material3)
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        sortedOptions.forEach { option ->
                            val isSelected = somaticSelections.contains(option.key)
                            val badgeColor = when (option.state) {
                                "ventral" -> Color(0xFF64E49F)
                                "sympathetic" -> Color(0xFFFBA044)
                                "dorsal" -> Color(0xFF62A4FF)
                                else -> Color.White
                            }

                            Card(
                                modifier = Modifier
                                    .clickable {
                                        if (isSelected) {
                                            somaticSelections.remove(option.key)
                                        } else {
                                            if (somaticSelections.size < 3) {
                                                somaticSelections.add(option.key)
                                            }
                                        }
                                    }
                                    .border(
                                        1.dp,
                                        if (isSelected) badgeColor else Color.White.copy(alpha = 0.08f),
                                        RoundedCornerShape(20.dp)
                                    ),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) badgeColor.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.04f)
                                )
                            ) {
                                Text(
                                    text = option.text,
                                    color = if (isSelected) badgeColor else Color.White.copy(alpha = 0.8f),
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                                )
                            }
                        }
                    }
                }

                CheckinStep.AFFECT_GRID -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Enerjini haritada işaretle",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { activeInfoKey = "step2" }) {
                            Icon(Icons.Default.Info, contentDescription = "Bilgi", tint = Color.White.copy(alpha = 0.4f))
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Suggestion prediction dot based on Step 1 averages
                    val suggestedCoords = remember {
                        if (somaticSelections.isEmpty()) null
                        else {
                            val sumA = somaticSelections.map { key -> somaticOptions.first { it.key == key }.a }.average().toFloat()
                            val sumV = somaticSelections.map { key -> somaticOptions.first { it.key == key }.v }.average().toFloat()
                            Offset(sumV, sumA)
                        }
                    }

                    // Affect Grid container
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .background(Color.White.copy(alpha = 0.03f), RoundedCornerShape(24.dp))
                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp))
                            .pointerInput(Unit) {
                                detectTapGestures { offset ->
                                    val v = (offset.x / size.width).coerceIn(0f, 1f)
                                    val a = (1f - (offset.y / size.height)).coerceIn(0f, 1f)
                                    preValence = v
                                    preArousal = a
                                    calculatedState = if (v >= 0.5f) "ventral" else if (a >= 0.5f) "sympathetic" else "dorsal"
                                }
                            }
                    ) {
                        // Draw axes and crosshairs
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height

                            // Horizontal midline
                            drawLine(
                                color = Color.White.copy(alpha = 0.15f),
                                start = Offset(0f, h / 2),
                                end = Offset(w, h / 2),
                                strokeWidth = 2f
                            )

                            // Vertical midline
                            drawLine(
                                color = Color.White.copy(alpha = 0.15f),
                                start = Offset(w / 2, 0f),
                                end = Offset(w / 2, h),
                                strokeWidth = 2f
                            )
                        }

                        // Grid corner labels
                        Text("Coşku / Akış", color = Color(0xFF64E49F).copy(alpha = 0.4f), fontSize = 10.sp, modifier = Modifier.align(Alignment.TopEnd).padding(16.dp))
                        Text("Teyakkuz / Gerginlik", color = Color(0xFFFBA044).copy(alpha = 0.4f), fontSize = 10.sp, modifier = Modifier.align(Alignment.TopStart).padding(16.dp))
                        Text("Ağırlık / Sis", color = Color(0xFF62A4FF).copy(alpha = 0.4f), fontSize = 10.sp, modifier = Modifier.align(Alignment.BottomStart).padding(16.dp))
                        Text("Dinginlik / Dinlenme", color = Color(0xFF64E49F).copy(alpha = 0.4f), fontSize = 10.sp, modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp))

                        // Axis labels
                        Text("Yüksek Enerji", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.TopCenter).padding(6.dp))
                        Text("Düşük Enerji", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.BottomCenter).padding(6.dp))
                        Text("Direnç", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.CenterStart).padding(6.dp))
                        Text("Akış", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.CenterEnd).padding(6.dp))

                        // Draw suggested location (Step 1 prediction)
                        suggestedCoords?.let { coords ->
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                            ) {
                                Canvas(modifier = Modifier.fillMaxSize()) {
                                    drawCircle(
                                        color = Color.White.copy(alpha = 0.25f),
                                        radius = 16f,
                                        center = Offset(coords.x * size.width, (1f - coords.y) * size.height)
                                    )
                                    drawCircle(
                                        color = Color.White.copy(alpha = 0.1f),
                                        radius = 32f,
                                        center = Offset(coords.x * size.width, (1f - coords.y) * size.height),
                                        style = Stroke(width = 2f)
                                    )
                                }
                            }
                        }

                        // Draw user dot
                        if (preValence != null && preArousal != null) {
                            val color = when (calculatedState) {
                                "ventral" -> Color(0xFF64E49F)
                                "sympathetic" -> Color(0xFFFBA044)
                                "dorsal" -> Color(0xFF62A4FF)
                                else -> Color.White
                            }

                            Box(modifier = Modifier.fillMaxSize()) {
                                Canvas(modifier = Modifier.fillMaxSize()) {
                                    val posX = preValence!! * size.width
                                    val posY = (1f - preArousal!!) * size.height
                                    drawCircle(
                                        color = color,
                                        radius = 18f,
                                        center = Offset(posX, posY)
                                    )
                                    drawCircle(
                                        color = color.copy(alpha = 0.3f),
                                        radius = 32f,
                                        center = Offset(posX, posY),
                                        style = Stroke(width = 4f)
                                    )
                                }
                            }
                        }
                    }
                }

                CheckinStep.EMOTION_REFINEMENT -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Bu hissi nasıl isimlendirirsin?",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { activeInfoKey = "step2b" }) {
                            Icon(Icons.Default.Info, contentDescription = "Bilgi", tint = Color.White.copy(alpha = 0.4f))
                        }
                    }
                    Text(
                        text = "Sana en yakın olanları seç (max 3)",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                    )

                    val stateEmotions = emotionsMap[calculatedState] ?: emptyList()
                    val badgeColor = when (calculatedState) {
                        "ventral" -> Color(0xFF64E49F)
                        "sympathetic" -> Color(0xFFFBA044)
                        "dorsal" -> Color(0xFF62A4FF)
                        else -> Color.White
                    }

                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        stateEmotions.forEach { (emoKey, label) ->
                            val isSelected = selectedEmotions.contains(emoKey)

                            Card(
                                modifier = Modifier
                                    .clickable {
                                        if (isSelected) {
                                            selectedEmotions.remove(emoKey)
                                        } else {
                                            if (selectedEmotions.size < 3) {
                                                selectedEmotions.add(emoKey)
                                            }
                                        }
                                    }
                                    .border(
                                        1.dp,
                                        if (isSelected) badgeColor else Color.White.copy(alpha = 0.08f),
                                        RoundedCornerShape(20.dp)
                                    ),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) badgeColor.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.04f)
                                )
                            ) {
                                Text(
                                    text = label,
                                    color = if (isSelected) badgeColor else Color.White.copy(alpha = 0.8f),
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                                )
                            }
                        }
                    }
                }

                CheckinStep.MEDITATION_LOADING -> {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = currentProtocol.title,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Hazırlanıyor...",
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.5f),
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(48.dp))

                        // Progress Countdown circle
                        Box(
                            modifier = Modifier.size(160.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                drawCircle(
                                    color = Color.White.copy(alpha = 0.05f),
                                    style = Stroke(width = 4.dp.toPx())
                                )
                                drawArc(
                                    color = currentProtocol.color,
                                    startAngle = -90f,
                                    sweepAngle = 360f * countdownProgress,
                                    useCenter = false,
                                    style = Stroke(width = 6.dp.toPx())
                                )
                            }
                            Text(
                                text = countdownVal.toString(),
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Light,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.height(48.dp))

                        Button(
                            onClick = { currentStep = CheckinStep.EXERCISE },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f)),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text("Atla", color = Color.White)
                        }
                    }
                }

                CheckinStep.EXERCISE -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = currentProtocol.title,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { activeInfoKey = "step3" }) {
                            Icon(Icons.Default.Info, contentDescription = "Bilgi", tint = Color.White.copy(alpha = 0.4f))
                        }
                    }
                    Text(
                        text = "Daireyi takip et.",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp, bottom = 48.dp)
                    )

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Breathing bubble
                        val phases = currentProtocol.phases
                        val activePhase = phases[breathingPhaseIndex]
                        Box(
                            modifier = Modifier
                                .size(240.dp)
                                .scale(breathScale.value)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        colors = listOf(
                                            currentProtocol.color.copy(alpha = 0.25f),
                                            Color.Transparent
                                        )
                                    )
                                )
                                .border(2.dp, currentProtocol.color.copy(alpha = 0.8f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = activePhase.name,
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 24.sp,
                                textAlign = TextAlign.Center
                            )
                        }

                        Spacer(modifier = Modifier.height(48.dp))

                        Text(
                            text = currentProtocol.description,
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )
                    }
                }

                CheckinStep.SAVORING_PROMPT -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Şu an bedeninde neyin değiştiğini fark et.",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { activeInfoKey = "step4" }) {
                            Icon(Icons.Default.Info, contentDescription = "Bilgi", tint = Color.White.copy(alpha = 0.4f))
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    AnimatedVisibility(
                        visible = showMarinationChips,
                        enter = fadeIn() + expandVertically()
                    ) {
                        Column {
                            Text(
                                text = "Ne hissediyorsun?",
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.6f),
                                modifier = Modifier.padding(bottom = 16.dp)
                            )

                            val badgeColor = when (calculatedState) {
                                "ventral" -> Color(0xFF64E49F)
                                "sympathetic" -> Color(0xFFFBA044)
                                "dorsal" -> Color(0xFF62A4FF)
                                else -> Color.White
                            }

                            FlowRow(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                marinationOptions.forEach { (marKey, label) ->
                                    val isSelected = marinationSelections.contains(marKey)

                                    Card(
                                        modifier = Modifier
                                            .clickable {
                                                if (isSelected) {
                                                    marinationSelections.remove(marKey)
                                                } else {
                                                    marinationSelections.add(marKey)
                                                }
                                            }
                                            .border(
                                                1.dp,
                                                if (isSelected) badgeColor else Color.White.copy(alpha = 0.08f),
                                                RoundedCornerShape(20.dp)
                                            ),
                                        shape = RoundedCornerShape(20.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (isSelected) badgeColor.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.04f)
                                        )
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (isSelected) badgeColor else Color.White.copy(alpha = 0.8f),
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (!showMarinationChips) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            CircularProgressIndicator(color = Color.White.copy(alpha = 0.4f))
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Bedenine odaklan...",
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.4f),
                                fontStyle = FontStyle.Italic
                            )
                        }
                    }
                }

                CheckinStep.SAVORING_NOTE -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Bugün fark ettiğin güzel bir şey oldu mu?",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { activeInfoKey = "step6" }) {
                            Icon(Icons.Default.Info, contentDescription = "Bilgi", tint = Color.White.copy(alpha = 0.4f))
                        }
                    }
                    Text(
                        text = "Döngüyü tamamlamak için bir odaklanma anı.",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                    )

                    // Note input field
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(24.dp)),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.03f)),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp)
                        ) {
                            if (savoringNoteText.isEmpty()) {
                                Text(
                                    text = "örn. kahvenin kokusu, sıcak bir esinti, küçük bir işi bitirmek...",
                                    color = Color.White.copy(alpha = 0.4f),
                                    fontSize = 14.sp
                                )
                            }

                            BasicTextField(
                                value = savoringNoteText,
                                onValueChange = { savoringNoteText = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 120.dp),
                                textStyle = TextStyle(color = Color.White, fontSize = 14.sp),
                                cursorBrush = SolidColor(Color.White)
                            )
                        }
                    }
                }

                CheckinStep.COMPLETION -> {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // Star decoration drawing
                        Box(
                            modifier = Modifier
                                .size(120.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                val w = size.width
                                val h = size.height
                                val center = Offset(w / 2, h / 2)

                                // Main Sparkle Star
                                val path = Path().apply {
                                    moveTo(center.x, 10f) // top
                                    quadraticBezierTo(center.x, center.y, w - 10f, center.y) // right curve
                                    quadraticBezierTo(center.x, center.y, center.x, h - 10f) // bottom curve
                                    quadraticBezierTo(center.x, center.y, 10f, center.y) // left curve
                                    quadraticBezierTo(center.x, center.y, center.x, 10f) // top curve
                                    close()
                                }

                                drawPath(
                                    path = path,
                                    brush = Brush.radialGradient(
                                        colors = listOf(
                                            Color(0xFFFFD700),
                                            Color(0xFF858DFF)
                                        ),
                                        center = center
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(32.dp))

                        Text(
                            text = "Harikasın.",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Sinir sistemin sana minnettar.",
                            fontSize = 16.sp,
                            color = Color.White.copy(alpha = 0.7f),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }
        }

        CheckinHUD(
            step = currentStep,
            isNextEnabled = when (currentStep) {
                CheckinStep.MORNING_CHECKIN -> dreamQuality != null && awakeningState != null
                CheckinStep.SOMATIC_ENTRY -> somaticSelections.isNotEmpty()
                CheckinStep.AFFECT_GRID -> preValence != null && preArousal != null
                CheckinStep.EMOTION_REFINEMENT -> selectedEmotions.isNotEmpty()
                CheckinStep.EXERCISE -> true
                CheckinStep.SAVORING_PROMPT -> marinationSelections.isNotEmpty()
                CheckinStep.SAVORING_NOTE -> true
                CheckinStep.COMPLETION -> true
                else -> true
            },
            onNext = {
                when (currentStep) {
                    CheckinStep.MORNING_CHECKIN -> currentStep = CheckinStep.SOMATIC_ENTRY
                    CheckinStep.SOMATIC_ENTRY -> currentStep = CheckinStep.AFFECT_GRID
                    CheckinStep.AFFECT_GRID -> currentStep = CheckinStep.EMOTION_REFINEMENT
                    CheckinStep.EMOTION_REFINEMENT -> currentStep = CheckinStep.MEDITATION_LOADING
                    CheckinStep.EXERCISE -> {
                        breathingIsRunning = false
                        currentStep = CheckinStep.SAVORING_PROMPT
                    }
                    CheckinStep.SAVORING_PROMPT -> currentStep = CheckinStep.SAVORING_NOTE
                    CheckinStep.SAVORING_NOTE -> {
                        val entry = CheckinEntry(
                            state = calculatedState,
                            note = savoringNoteText,
                            timestamp = System.currentTimeMillis(),
                            emotions = selectedEmotions.toList(),
                            somaticKeys = somaticSelections.toList(),
                            preValence = preValence ?: 0.5f,
                            preArousal = preArousal ?: 0.5f,
                            dreamQuality = dreamQuality,
                            awakeningState = awakeningState,
                            marinationSelections = marinationSelections.toList()
                        )
                        onCompleteCheckin(entry)
                    }
                    CheckinStep.COMPLETION -> {
                        val entry = CheckinEntry(
                            state = calculatedState,
                            note = savoringNoteText,
                            timestamp = System.currentTimeMillis(),
                            emotions = selectedEmotions.toList(),
                            somaticKeys = somaticSelections.toList(),
                            preValence = preValence ?: 0.5f,
                            preArousal = preArousal ?: 0.5f,
                            dreamQuality = dreamQuality,
                            awakeningState = awakeningState,
                            marinationSelections = marinationSelections.toList()
                        )
                        onCompleteCheckin(entry)
                    }
                    else -> {}
                }
            },
            onBack = {
                when (currentStep) {
                    CheckinStep.SOMATIC_ENTRY -> {
                        val isMorning = Calendar.getInstance().get(Calendar.HOUR_OF_DAY) in 5..11
                        val alreadyCheckedInToday = recentEntries.any {
                            val entryCal = Calendar.getInstance().apply { timeInMillis = it.timestamp }
                            val nowCal = Calendar.getInstance()
                            entryCal.get(Calendar.YEAR) == nowCal.get(Calendar.YEAR) &&
                                    entryCal.get(Calendar.DAY_OF_YEAR) == nowCal.get(Calendar.DAY_OF_YEAR)
                        }
                        if (isMorning && !alreadyCheckedInToday) {
                            currentStep = CheckinStep.MORNING_CHECKIN
                        } else {
                            onBack()
                        }
                    }
                    CheckinStep.AFFECT_GRID -> currentStep = CheckinStep.SOMATIC_ENTRY
                    CheckinStep.EMOTION_REFINEMENT -> currentStep = CheckinStep.AFFECT_GRID
                    CheckinStep.EXERCISE -> currentStep = CheckinStep.EMOTION_REFINEMENT
                    CheckinStep.SAVORING_PROMPT -> currentStep = CheckinStep.EXERCISE
                    CheckinStep.SAVORING_NOTE -> currentStep = CheckinStep.SAVORING_PROMPT
                    else -> onBack()
                }
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFF0A0C12).copy(alpha = 0.85f),
                            Color(0xFF0A0C12).copy(alpha = 0.98f)
                        )
                    )
                )
        )
    }


    activeInfoKey?.let { key ->
        AuraInfoDialog(infoKey = key) {
            activeInfoKey = null
        }
    }
}
