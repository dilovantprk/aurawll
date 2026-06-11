package com.aura.wellness.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

private enum class SleepPhase {
    ENTRY, MIND_DUMP, COACH, CBTI
}

private val coachPrompts = listOf(
    "Hoş geldin.",
    "Bugün yeterliydi.",
    "Bırakma zamanı.",
    "Burnundan 4 sayı nefes al...",
    "7 sayı tut...",
    "8 sayı ağızdan ver...",
    "Tekrar. 4 sayı al...",
    "7 sayı tut...",
    "8 sayı ver...",
    "Çeneni gevşet.",
    "Dilini damağından indir.",
    "Omuzlarını bırak.",
    "Ellerini aç.",
    "Bacaklarını ağır hisset.",
    "Bugün olan oldu.",
    "Yarın kendi gelecek.",
    "Sadece bu nefes.",
    "Sistemin dinleniyor.",
    "Güvendesin.",
    "İyi geceler."
)

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun SleepScreen(onBack: () -> Unit) {
    var currentPhase by remember { mutableStateOf(SleepPhase.ENTRY) }

    AnimatedContent(
        targetState = currentPhase,
        transitionSpec = {
            fadeIn(animationSpec = tween(500)) togetherWith
                    fadeOut(animationSpec = tween(500))
        },
        label = "sleepPhaseTransition"
    ) { phase ->
        when (phase) {
            SleepPhase.ENTRY -> EntryPhase(
                onMindDump = { currentPhase = SleepPhase.MIND_DUMP },
                onCoach = { currentPhase = SleepPhase.COACH }
            )
            SleepPhase.MIND_DUMP -> MindDumpPhase(
                onContinue = { currentPhase = SleepPhase.COACH }
            )
            SleepPhase.COACH -> CoachPhase(
                onCbti = { currentPhase = SleepPhase.CBTI },
                onClose = onBack
            )
            SleepPhase.CBTI -> CbtiPhase(
                onClose = onBack
            )
        }
    }
}

// ─── ENTRY PHASE ────────────────────────────────────────────────────────────────

@Composable
private fun EntryPhase(
    onMindDump: () -> Unit,
    onCoach: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "DERİN UYKU",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White.copy(alpha = 0.4f),
            letterSpacing = 4.sp
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "sinir sistemi kapatma ritüeli",
            fontSize = 14.sp,
            color = Color.White.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(48.dp))

        // 3 large glass buttons
        EntryButton(text = "Aklım durmuyor", onClick = onMindDump)
        Spacer(modifier = Modifier.height(16.dp))
        EntryButton(text = "Bedenim gergin", onClick = onCoach)
        Spacer(modifier = Modifier.height(16.dp))
        EntryButton(text = "Uyuyamıyorum", onClick = onCoach)
    }
}

@Composable
private fun EntryButton(text: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp)
            .border(
                1.dp,
                Color.White.copy(alpha = 0.08f),
                RoundedCornerShape(24.dp)
            )
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = Color.White.copy(alpha = 0.04f)
        ),
        shape = RoundedCornerShape(24.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}

// ─── MIND DUMP PHASE ────────────────────────────────────────────────────────────

@Composable
private fun MindDumpPhase(onContinue: () -> Unit) {
    var text by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .padding(horizontal = 24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(80.dp))

        Text(
            text = "Aklını boşalt",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Yazılanlar kaydedilmez. Sadece bırakma eylemi önemli.",
            fontSize = 14.sp,
            color = Color.White.copy(alpha = 0.6f),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Glass text field
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 200.dp)
                .border(
                    1.dp,
                    Color.White.copy(alpha = 0.08f),
                    RoundedCornerShape(24.dp)
                ),
            colors = CardDefaults.cardColors(
                containerColor = Color.White.copy(alpha = 0.04f)
            ),
            shape = RoundedCornerShape(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 200.dp)
                    .padding(20.dp)
            ) {
                if (text.isEmpty()) {
                    Text(
                        text = "Ne varsa yaz, bırak...",
                        fontSize = 15.sp,
                        color = Color.White.copy(alpha = 0.3f)
                    )
                }
                BasicTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(
                        color = Color.White,
                        fontSize = 15.sp,
                        lineHeight = 24.sp
                    ),
                    cursorBrush = SolidColor(Color.White.copy(alpha = 0.6f))
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onContinue,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor = Color.Black
            ),
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Text(
                text = "Bıraktım, Devam Et",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

// ─── COACH PHASE (Silent Coach Protocol) ────────────────────────────────────────

@Composable
private fun CoachPhase(
    onCbti: () -> Unit,
    onClose: () -> Unit
) {
    var currentPromptIndex by remember { mutableIntStateOf(0) }
    var isCoachFinished by remember { mutableStateOf(false) }

    // Advance prompt every 6 seconds
    LaunchedEffect(Unit) {
        for (i in coachPrompts.indices) {
            currentPromptIndex = i
            delay(6000L)
        }
        isCoachFinished = true
    }

    // Pulsing orb animation: scale between 0.85f and 1.15f over 8 seconds
    val infiniteTransition = rememberInfiniteTransition(label = "sleepPulse")
    val orbScale by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(8000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orbScale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxSize()
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // Pulsing orb
            Box(
                modifier = Modifier
                    .size(200.dp)
                    .scale(orbScale)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                Color(0xFF858DFF).copy(alpha = 0.3f),
                                Color(0xFF858DFF).copy(alpha = 0.05f),
                                Color.Transparent
                            )
                        )
                    )
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Coach text with fade transition
            AnimatedContent(
                targetState = if (isCoachFinished) -1 else currentPromptIndex,
                transitionSpec = {
                    fadeIn(animationSpec = tween(800)) togetherWith
                            fadeOut(animationSpec = tween(800))
                },
                label = "coachText",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp)
                    .heightIn(min = 80.dp)
            ) { index ->
                if (index >= 0 && index < coachPrompts.size) {
                    Text(
                        text = coachPrompts[index],
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Light,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    // Empty placeholder after prompts finish
                    Spacer(modifier = Modifier.fillMaxWidth())
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Bottom buttons – shown after coach finishes
            AnimatedVisibility(
                visible = isCoachFinished,
                enter = fadeIn(animationSpec = tween(600)),
                exit = fadeOut(animationSpec = tween(300))
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(horizontal = 24.dp)
                ) {
                    Button(
                        onClick = onCbti,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White.copy(alpha = 0.04f),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(24.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            Color.White.copy(alpha = 0.08f)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    ) {
                        Text(
                            text = "Hâlâ uyuyamıyor musun?",
                            fontWeight = FontWeight.Medium,
                            fontSize = 15.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    TextButton(
                        onClick = onClose,
                        modifier = Modifier.height(48.dp)
                    ) {
                        Text(
                            text = "Kapat",
                            color = Color.White.copy(alpha = 0.4f),
                            fontSize = 14.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

// ─── CBTI PHASE ─────────────────────────────────────────────────────────────────

@Composable
private fun CbtiPhase(onClose: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Panik Yok",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )

        Spacer(modifier = Modifier.height(32.dp))

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    1.dp,
                    Color.White.copy(alpha = 0.08f),
                    RoundedCornerShape(24.dp)
                ),
            colors = CardDefaults.cardColors(
                containerColor = Color.White.copy(alpha = 0.04f)
            ),
            shape = RoundedCornerShape(24.dp)
        ) {
            Text(
                text = "Yataktan kalk. Loş ışıkta otur. Sıkıcı bir şey oku. Gözlerin kapanınca geri dön.",
                fontSize = 15.sp,
                color = Color.White.copy(alpha = 0.7f),
                lineHeight = 24.sp,
                modifier = Modifier.padding(24.dp)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onClose,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor = Color.Black
            ),
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Text(
                text = "Anladım, Kapat",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}
