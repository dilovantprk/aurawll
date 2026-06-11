package com.aura.wellness.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuraHeader(
    currentScreen: Screen,
    modifier: Modifier = Modifier
) {
    val title = when (currentScreen) {
        is Screen.Dashboard -> "Keşfet"
        is Screen.Breathing -> "Nefes"
        is Screen.Notebook -> "Günlük"
        is Screen.Focus -> "Odak"
        is Screen.Ambient -> "Ortam"
        is Screen.Sleep -> "Uyku"
        is Screen.Settings -> "Profil"
        else -> ""
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(64.dp)
            .clip(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.12f),
                        Color.White.copy(alpha = 0.06f)
                    )
                )
            )
            .background(MaterialTheme.colorScheme.surface)
            .border(
                1.dp,
                Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.45f),
                        Color.White.copy(alpha = 0.15f)
                    )
                ),
                RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
            )
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Aura",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = Color.White,
                letterSpacing = (-0.5).sp
            )
            
            if (title.isNotEmpty()) {
                Spacer(modifier = Modifier.width(12.dp))
                // Vertical divider matching web .active-tab-name::before
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(14.dp)
                        .background(Color.White.copy(alpha = 0.2f))
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = title,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
fun AuraNavigationBar(
    currentScreen: Screen,
    showNotebook: Boolean,
    showFocus: Boolean,
    showAmbient: Boolean,
    showSleep: Boolean,
    onNavigate: (Screen) -> Unit,
    modifier: Modifier = Modifier
) {
    val items = remember(showNotebook, showFocus, showAmbient, showSleep) {
        val list = mutableListOf<NavigationItem>()
        list.add(NavigationItem("Keşfet", Icons.Default.Home, Screen.Dashboard))
        list.add(NavigationItem("Nefes", Icons.Default.Air, Screen.Breathing))
        
        if (showFocus) {
            list.add(NavigationItem("Odak", Icons.Default.Timer, Screen.Focus))
        }
        if (showAmbient) {
            list.add(NavigationItem("Ortam", Icons.Default.GraphicEq, Screen.Ambient))
        }
        if (showSleep) {
            list.add(NavigationItem("Uyku", Icons.Default.Bedtime, Screen.Sleep))
        }
        if (showNotebook) {
            list.add(NavigationItem("Günlük", Icons.Default.Edit, Screen.Notebook))
        }
        
        list.add(NavigationItem("Profil", Icons.Default.Person, Screen.Settings))
        list.toList()
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .navigationBarsPadding() // Respect device navigation bar padding
            .height(64.dp)
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.12f),
                        Color.White.copy(alpha = 0.06f)
                    )
                )
            )
            .background(MaterialTheme.colorScheme.surface)
            .border(
                1.dp,
                Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.15f),
                        Color.White.copy(alpha = 0.45f)
                    )
                ),
                RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            )
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEach { item ->
                val isActive = when (item.screen) {
                    Screen.Dashboard -> currentScreen is Screen.Dashboard
                    Screen.Breathing -> currentScreen is Screen.Breathing
                    Screen.Notebook -> currentScreen is Screen.Notebook
                    Screen.Focus -> currentScreen is Screen.Focus
                    Screen.Ambient -> currentScreen is Screen.Ambient
                    Screen.Sleep -> currentScreen is Screen.Sleep
                    Screen.Settings -> currentScreen is Screen.Settings
                    else -> false
                }

                val tintColor by animateColorAsState(
                    targetValue = if (isActive) Color.White else Color.White.copy(alpha = 0.45f),
                    animationSpec = tween(durationMillis = 300),
                    label = "tintColor"
                )

                val indicatorHeight by animateDpAsState(
                    targetValue = if (isActive) 2.dp else 0.dp,
                    animationSpec = tween(durationMillis = 300),
                    label = "indicatorHeight"
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            onNavigate(item.screen)
                        },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.label,
                        tint = tintColor,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = item.label.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                        color = tintColor,
                        letterSpacing = 0.8.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    // Active tab line indicator matching web .nav-indicator
                    Box(
                        modifier = Modifier
                            .width(24.dp)
                            .height(indicatorHeight)
                            .background(
                                color = if (isActive) MaterialTheme.colorScheme.primary else Color.Transparent,
                                shape = RoundedCornerShape(1.dp)
                            )
                    )
                }
            }
        }
    }
}

private data class NavigationItem(
    val label: String,
    val icon: ImageVector,
    val screen: Screen
)
