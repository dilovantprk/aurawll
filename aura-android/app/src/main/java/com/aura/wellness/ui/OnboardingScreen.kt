package com.aura.wellness.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

data class OnboardingPage(
    val emoji: String,
    val title: String,
    val body: String
)

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val pages = remember {
        listOf(
            OnboardingPage(
                emoji = "🧠",
                title = "Sinir sistemin sürekli konuşuyor.",
                body = "Aura, onu dinlemeyi ve yanıt vermeyi öğretir. Bedenin sana ne söylüyor, birlikte keşfedelim."
            ),
            OnboardingPage(
                emoji = "🫀",
                title = "Bozuk değilsin. Disregülesin.",
                body = "Polyvagal teori, sinir sisteminin üç durumunu tanımlar: güvende (ventral), tetikte (sempatik) ve donmuş (dorsal). Hiçbiri kötü değil — hepsi hayatta kalmak için."
            ),
            OnboardingPage(
                emoji = "🌊",
                title = "Fark et. Regüle ol. Absorbe et.",
                body = "30 saniyede fark et. 3 dakikada kaydır. 20 saniyede sindirme. Her check-in, sinir sistemine küçük bir hediye."
            ),
            OnboardingPage(
                emoji = "✨",
                title = "Check-in'e hazır mısın?",
                body = "Seri yok. Baskı yok. Sadece sen ve sinir sistemin."
            )
        )
    }

    val pagerState = rememberPagerState(pageCount = { pages.size })
    val coroutineScope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        // Skip button (top right, hidden on last page)
        if (pagerState.currentPage < pages.size - 1) {
            Text(
                text = "Atla",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 56.dp, end = 24.dp)
                    .clickable { onComplete() }
                    .padding(8.dp)
            )
        }

        // Pages
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { page ->
            val currentPage = pages[page]
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Large emoji
                Text(
                    text = currentPage.emoji,
                    fontSize = 72.sp,
                    modifier = Modifier.padding(bottom = 32.dp)
                )

                // Title
                Text(
                    text = currentPage.title,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    lineHeight = 32.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Body
                Text(
                    text = currentPage.body,
                    fontSize = 15.sp,
                    color = Color.White.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                    lineHeight = 24.sp
                )

                // Final page CTA button
                if (page == pages.size - 1) {
                    Spacer(modifier = Modifier.height(48.dp))
                    Button(
                        onClick = { onComplete() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color.Black
                        ),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Text("Hadi Başlayalım", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Dot indicators
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(pages.size) { index ->
                val isActive = pagerState.currentPage == index
                val width by animateDpAsState(
                    targetValue = if (isActive) 20.dp else 8.dp,
                    animationSpec = spring()
                )
                val color by animateColorAsState(
                    targetValue = if (isActive) Color(0xFF858DFF) else Color.White.copy(alpha = 0.2f)
                )
                Box(
                    modifier = Modifier
                        .height(8.dp)
                        .width(width)
                        .clip(CircleShape)
                        .background(color)
                        .clickable {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(index)
                            }
                        }
                )
            }
        }
    }
}
