package com.aura.wellness.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

private enum class FocusPhase {
    SETUP, ACTIVE, COMPLETE
}

private data class FocusTodoItem(
    val text: String,
    val isCompleted: Boolean = false
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FocusScreen(onBack: () -> Unit) {
    // Phase state
    var phase by remember { mutableStateOf(FocusPhase.SETUP) }

    // SETUP state
    var sessionName by remember { mutableStateOf("") }
    var workMinutes by remember { mutableIntStateOf(25) }
    var breakMinutes by remember { mutableIntStateOf(5) }
    var totalSets by remember { mutableIntStateOf(4) }

    // Todo state
    var todoItems by remember { mutableStateOf(listOf<FocusTodoItem>()) }
    var newTodoText by remember { mutableStateOf("") }

    // ACTIVE state
    var timeLeft by remember { mutableIntStateOf(0) }
    var isRunning by remember { mutableStateOf(false) }
    var isWorkMode by remember { mutableStateOf(true) }
    var currentSet by remember { mutableIntStateOf(1) }
    var showStopConfirm by remember { mutableStateOf(false) }

    // Timer total for progress calculation
    val totalTime = remember(isWorkMode, workMinutes, breakMinutes) {
        if (isWorkMode) workMinutes * 60 else breakMinutes * 60
    }

    // Timer logic
    LaunchedEffect(isRunning, phase) {
        if (isRunning && phase == FocusPhase.ACTIVE) {
            while (timeLeft > 0 && isRunning) {
                delay(1000)
                if (isRunning) {
                    timeLeft--
                }
            }
            if (timeLeft <= 0 && isRunning) {
                if (isWorkMode) {
                    // Work done → switch to break or complete
                    if (currentSet >= totalSets) {
                        isRunning = false
                        phase = FocusPhase.COMPLETE
                    } else {
                        isWorkMode = false
                        timeLeft = breakMinutes * 60
                    }
                } else {
                    // Break done → next work set
                    currentSet++
                    isWorkMode = true
                    timeLeft = workMinutes * 60
                }
            }
        }
    }

    // Colors
    val accentPurple = Color(0xFF858DFF)
    val accentGreen = Color(0xFF64E49F)
    val dangerRed = Color(0xFFFF6B6B)

    when (phase) {
        FocusPhase.SETUP -> {
            val pagerState = rememberPagerState(pageCount = { 2 })

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Transparent)
                    .padding(horizontal = 20.dp)
                    .padding(top = 16.dp, bottom = 24.dp)
            ) {
                // Pager content
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.weight(1f)
                ) { page ->
                    when (page) {
                        0 -> {
                            // Page 1: Session Configuration
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(top = 8.dp)
                            ) {
                                // Section label
                                Text(
                                    text = "ODAK SERİSİ",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 4.sp,
                                    color = Color.White.copy(alpha = 0.4f)
                                )

                                Spacer(modifier = Modifier.height(24.dp))

                                // Session Name Input
                                Text(
                                    text = "Session Adı",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color.White.copy(alpha = 0.75f),
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                                    shape = RoundedCornerShape(24.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 20.dp, vertical = 16.dp)
                                    ) {
                                        if (sessionName.isEmpty()) {
                                            Text(
                                                text = "Odak seansı...",
                                                color = Color.White.copy(alpha = 0.4f),
                                                fontSize = 15.sp
                                            )
                                        }
                                        BasicTextField(
                                            value = sessionName,
                                            onValueChange = { sessionName = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            textStyle = TextStyle(color = Color.White, fontSize = 15.sp),
                                            cursorBrush = SolidColor(Color.White),
                                            singleLine = true
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(32.dp))

                                // Work Time Stepper
                                StepperRow(
                                    label = "Çalışma Süresi",
                                    value = workMinutes,
                                    suffix = "dk",
                                    min = 5,
                                    max = 90,
                                    onValueChange = { workMinutes = it }
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                // Break Time Stepper
                                StepperRow(
                                    label = "Mola Süresi",
                                    value = breakMinutes,
                                    suffix = "dk",
                                    min = 1,
                                    max = 30,
                                    onValueChange = { breakMinutes = it }
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                // Sets Stepper
                                StepperRow(
                                    label = "Set Sayısı",
                                    value = totalSets,
                                    suffix = "",
                                    min = 1,
                                    max = 12,
                                    onValueChange = { totalSets = it }
                                )
                            }
                        }
                        1 -> {
                            // Page 2: Focus Intentions (Todo)
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(top = 8.dp)
                            ) {
                                Text(
                                    text = "Odak Niyetleri",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                // Add todo input
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .weight(1f)
                                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp)),
                                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                                        shape = RoundedCornerShape(24.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 16.dp, vertical = 14.dp)
                                        ) {
                                            if (newTodoText.isEmpty()) {
                                                Text(
                                                    text = "Yeni niyet ekle...",
                                                    color = Color.White.copy(alpha = 0.4f),
                                                    fontSize = 14.sp
                                                )
                                            }
                                            BasicTextField(
                                                value = newTodoText,
                                                onValueChange = { newTodoText = it },
                                                modifier = Modifier.fillMaxWidth(),
                                                textStyle = TextStyle(color = Color.White, fontSize = 14.sp),
                                                cursorBrush = SolidColor(Color.White),
                                                singleLine = true
                                            )
                                        }
                                    }

                                    // Add button
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(accentPurple.copy(alpha = 0.2f))
                                            .border(1.dp, accentPurple.copy(alpha = 0.4f), CircleShape)
                                            .clickable {
                                                if (newTodoText.isNotBlank()) {
                                                    todoItems = todoItems + FocusTodoItem(newTodoText.trim())
                                                    newTodoText = ""
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "+",
                                            color = Color.White,
                                            fontSize = 20.sp,
                                            fontWeight = FontWeight.Light
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                // Todo list
                                LazyColumn(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    itemsIndexed(todoItems) { index, item ->
                                        Card(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp)),
                                            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.04f)),
                                            shape = RoundedCornerShape(20.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(horizontal = 12.dp, vertical = 12.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                // Custom checkbox
                                                Box(
                                                    modifier = Modifier
                                                        .size(20.dp)
                                                        .clip(CircleShape)
                                                        .then(
                                                            if (item.isCompleted) {
                                                                Modifier.background(accentPurple)
                                                            } else {
                                                                Modifier
                                                                    .background(Color.Transparent)
                                                                    .border(1.5.dp, Color.White.copy(alpha = 0.3f), CircleShape)
                                                            }
                                                        )
                                                        .clickable {
                                                            todoItems = todoItems.toMutableList().also {
                                                                it[index] = item.copy(isCompleted = !item.isCompleted)
                                                            }
                                                        },
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    if (item.isCompleted) {
                                                        Text("✓", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }

                                                Spacer(modifier = Modifier.width(12.dp))

                                                Text(
                                                    text = item.text,
                                                    color = if (item.isCompleted) Color.White.copy(alpha = 0.4f) else Color.White,
                                                    fontSize = 15.sp,
                                                    textDecoration = if (item.isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                                                    modifier = Modifier.weight(1f)
                                                )

                                                // Delete button
                                                Box(
                                                    modifier = Modifier
                                                        .size(28.dp)
                                                        .clip(CircleShape)
                                                        .clickable {
                                                            todoItems = todoItems.toMutableList().also {
                                                                it.removeAt(index)
                                                            }
                                                        },
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(
                                                        text = "×",
                                                        color = Color.White.copy(alpha = 0.4f),
                                                        fontSize = 18.sp
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Dot indicators
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    repeat(2) { index ->
                        val isSelected = pagerState.currentPage == index
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 4.dp)
                                .size(if (isSelected) 8.dp else 6.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isSelected) Color.White
                                    else Color.White.copy(alpha = 0.3f)
                                )
                        )
                    }
                }

                // Start button
                Button(
                    onClick = {
                        timeLeft = workMinutes * 60
                        isWorkMode = true
                        currentSet = 1
                        isRunning = true
                        phase = FocusPhase.ACTIVE
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color.Black
                    ),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Seansı Başlat", fontWeight = FontWeight.Bold)
                }
            }
        }

        FocusPhase.ACTIVE -> {
            // Pulse animation for current timeline dot
            val infiniteTransition = rememberInfiniteTransition(label = "dot_pulse")
            val dotAlpha by infiniteTransition.animateFloat(
                initialValue = 0.4f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(800, easing = EaseInOutSine),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "dot_alpha"
            )

            // Background tint
            val bgColor = if (isWorkMode)
                accentPurple.copy(alpha = 0.06f)
            else
                accentGreen.copy(alpha = 0.06f)

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(bgColor, Color.Transparent)
                        )
                    )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 20.dp)
                        .padding(top = 48.dp, bottom = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // Top section: status + timer
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Status label
                        Text(
                            text = if (isWorkMode) "ODAK" else "MOLA",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 3.sp,
                            color = if (isWorkMode) accentPurple else accentGreen
                        )

                        Spacer(modifier = Modifier.height(32.dp))

                        // Timer with circular progress
                        Box(
                            modifier = Modifier.size(260.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            // Background track
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                drawCircle(
                                    color = Color.White.copy(alpha = 0.05f),
                                    style = Stroke(width = 4.dp.toPx())
                                )
                            }

                            // Pulsing inner glow
                            Box(
                                modifier = Modifier
                                    .size(200.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.radialGradient(
                                            colors = if (isRunning) listOf(
                                                (if (isWorkMode) accentPurple else accentGreen).copy(alpha = 0.12f),
                                                Color.Transparent
                                            ) else listOf(Color.Transparent, Color.Transparent)
                                        )
                                    )
                            )

                            // Progress arc
                            val progress = if (totalTime > 0) timeLeft.toFloat() / totalTime.toFloat() else 0f
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                drawArc(
                                    color = if (isWorkMode) accentPurple else accentGreen,
                                    startAngle = -90f,
                                    sweepAngle = 360f * progress,
                                    useCenter = false,
                                    style = Stroke(width = 6.dp.toPx())
                                )
                            }

                            // Time display
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                val mins = timeLeft / 60
                                val secs = timeLeft % 60
                                Text(
                                    text = String.format("%02d:%02d", mins, secs),
                                    fontSize = 48.sp,
                                    fontWeight = FontWeight.Light,
                                    color = Color.White
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Session name
                        if (sessionName.isNotEmpty()) {
                            Text(
                                text = sessionName,
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                        }

                        // Set counter
                        Text(
                            text = "Set $currentSet / $totalSets",
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.5f)
                        )
                    }

                    // Middle section: timeline dots
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            for (set in 1..totalSets) {
                                // Work dot
                                val workCompleted = set < currentSet || (set == currentSet && !isWorkMode)
                                val isCurrentWork = set == currentSet && isWorkMode
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .then(
                                            when {
                                                workCompleted -> Modifier.background(accentPurple)
                                                isCurrentWork -> Modifier
                                                    .background(accentPurple.copy(alpha = dotAlpha))
                                                else -> Modifier
                                                    .background(Color.Transparent)
                                                    .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape)
                                            }
                                        )
                                )

                                // Break dot (except after last set)
                                if (set < totalSets) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    val breakCompleted = set < currentSet
                                    val isCurrentBreak = set == currentSet && !isWorkMode
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .then(
                                                when {
                                                    breakCompleted -> Modifier.background(accentGreen)
                                                    isCurrentBreak -> Modifier
                                                        .background(accentGreen.copy(alpha = dotAlpha))
                                                    else -> Modifier
                                                        .background(Color.Transparent)
                                                        .border(1.dp, Color.White.copy(alpha = 0.2f), CircleShape)
                                                }
                                            )
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                }
                            }
                        }
                    }

                    // Bottom section: controls
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Stop button
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(dangerRed.copy(alpha = 0.15f))
                                .border(1.dp, dangerRed.copy(alpha = 0.3f), CircleShape)
                                .clickable { showStopConfirm = true },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "■",
                                color = dangerRed,
                                fontSize = 16.sp
                            )
                        }

                        // Play/Pause button
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isRunning) accentPurple else Color.White.copy(alpha = 0.1f)
                                )
                                .border(
                                    1.dp,
                                    if (isRunning) accentPurple.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.15f),
                                    CircleShape
                                )
                                .clickable { isRunning = !isRunning },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (isRunning) "❚❚" else "▶",
                                color = Color.White,
                                fontSize = if (isRunning) 18.sp else 22.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // Stop confirmation dialog
            if (showStopConfirm) {
                AlertDialog(
                    onDismissRequest = { showStopConfirm = false },
                    title = {
                        Text(
                            "Seansı Bitir",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    text = {
                        Text(
                            "Devam eden odak seansını sonlandırmak istediğine emin misin?",
                            color = Color.White.copy(alpha = 0.75f)
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showStopConfirm = false
                                isRunning = false
                                phase = FocusPhase.SETUP
                            }
                        ) {
                            Text("Bitir", color = dangerRed)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showStopConfirm = false }) {
                            Text("Devam Et", color = Color.White)
                        }
                    },
                    containerColor = Color(0xFF1A1A2E),
                    shape = RoundedCornerShape(24.dp)
                )
            }
        }

        FocusPhase.COMPLETE -> {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Transparent)
                    .padding(horizontal = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "✨",
                    fontSize = 48.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "Seans Tamamlandı",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Harika bir odaklanmaydı. Sinir sistemin sana minnettar.",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )

                Spacer(modifier = Modifier.height(48.dp))

                Button(
                    onClick = {
                        phase = FocusPhase.SETUP
                        timeLeft = 0
                        isRunning = false
                        isWorkMode = true
                        currentSet = 1
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color.Black
                    ),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Tamam", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun StepperRow(
    label: String,
    value: Int,
    suffix: String,
    min: Int,
    max: Int,
    onValueChange: (Int) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 15.sp,
            color = Color.White.copy(alpha = 0.75f)
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Minus button
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f))
                    .clickable {
                        if (value > min) onValueChange(value - 1)
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "−",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Light
                )
            }

            // Value display
            Text(
                text = if (suffix.isNotEmpty()) "$value $suffix" else "$value",
                fontSize = 20.sp,
                fontWeight = FontWeight.Light,
                color = Color.White,
                modifier = Modifier.widthIn(min = 56.dp),
                textAlign = TextAlign.Center
            )

            // Plus button
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f))
                    .clickable {
                        if (value < max) onValueChange(value + 1)
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "+",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Light
                )
            }
        }
    }
}
