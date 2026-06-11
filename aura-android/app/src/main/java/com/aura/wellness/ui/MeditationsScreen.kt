package com.aura.wellness.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class MeditationProtocol(
    val id: String,
    val title: String,
    val category: String,
    val duration: String,
    val tagline: String
)

private val Accent = Color(0xFF858DFF)
private val CategoryColors = mapOf(
    "Sakinlik" to Color(0xFF64E49F),
    "Odak" to Accent,
    "Enerji" to Color(0xFFFBA044)
)

private val AllProtocols = listOf(
    MeditationProtocol("p_478", "4-7-8 Rahatlatıcı Nefes", "Sakinlik", "~2 dk", "Derin sakinleşme ve uyku öncesi"),
    MeditationProtocol("p_sigh", "Derin İç Çekiş", "Sakinlik", "2 dk", "Soğutucu nefes ile anlık rahatlama"),
    MeditationProtocol("p_bellows", "Enerji Körüğü", "Enerji", "1.5 dk", "Bedeni uyandıran hızlı nefes"),
    MeditationProtocol("p_resonance", "Rezonans Frekansı", "Odak", "~2 dk", "HRV'yi optimize eden denge nefesi"),
    MeditationProtocol("p_grounding", "Topraklama Nefesi", "Sakinlik", "2 dk", "Güvenli bağlantı ve yerleşme"),
    MeditationProtocol("p_phys_sigh", "Fizyolojik İç Çekiş", "Sakinlik", "1 dk", "Stanford araştırmasıyla kanıtlanmış"),
    MeditationProtocol("p_coherent", "Koherent Nefes", "Odak", "5 dk", "Kalp-beyin senkronizasyonu"),
    MeditationProtocol("p_ext_exhale", "Uzatılmış Veriş (4-8)", "Sakinlik", "2 dk", "Parasempatik aktivasyon"),
    MeditationProtocol("p_cyclic_sigh", "Döngüsel İç Çekiş", "Sakinlik", "5 dk", "Huberman Lab protokolü"),
    MeditationProtocol("p_fire", "Ateş Nefesi", "Enerji", "2 dk", "Kapalı sistemi uyandıran pranayama"),
    MeditationProtocol("p_nadi", "Nadi Shodhana", "Odak", "4 dk", "Sağ-sol beyin dengesi"),
    MeditationProtocol("p_box", "Kutu Nefesi", "Odak", "2 dk", "Navy SEAL odaklanma tekniği")
)

private val FilterCategories = listOf("Tümü", "Sakinlik", "Odak", "Enerji")

@Composable
fun MeditationsScreen(
    onSelectProtocol: (String) -> Unit,
    onBack: () -> Unit
) {
    var activeFilter by remember { mutableStateOf("Tümü") }
    var activeInfoKey by remember { mutableStateOf<String?>(null) }

    val filteredProtocols = remember(activeFilter) {
        if (activeFilter == "Tümü") AllProtocols
        else AllProtocols.filter { it.category == activeFilter }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
            .padding(horizontal = 16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Section label
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "MEDİTASYON",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
                color = Color.White.copy(alpha = 0.4f)
            )
            Text(
                text = "Geri",
                color = Accent,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clickable { onBack() }
                    .padding(4.dp)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Title row with info button
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Nefes Yöntemleri",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.width(6.dp))
            IconButton(
                onClick = { activeInfoKey = "meditations" },
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Bilgi",
                    tint = Color.White.copy(alpha = 0.4f),
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Subtitle
        Text(
            text = "Sinir sistemini regüle etmek için kanıta dayalı teknikler",
            fontSize = 14.sp,
            color = Color.White.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Filter Chips Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterCategories.forEach { category ->
                val isActive = activeFilter == category
                Box(
                    modifier = Modifier
                        .border(
                            width = 1.dp,
                            color = if (isActive) Accent else Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(100.dp)
                        )
                        .background(
                            color = if (isActive) Accent.copy(alpha = 0.2f)
                            else Color.White.copy(alpha = 0.04f),
                            shape = RoundedCornerShape(100.dp)
                        )
                        .clickable { activeFilter = category }
                        .padding(horizontal = 18.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = category,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (isActive) Accent else Color.White.copy(alpha = 0.6f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Protocol Cards Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(filteredProtocols, key = { it.id }) { protocol ->
                ProtocolCard(
                    protocol = protocol,
                    onClick = { onSelectProtocol(protocol.id) },
                    onInfoClick = { activeInfoKey = protocol.id }
                )
            }
        }
    }

    // Info dialog
    activeInfoKey?.let { key ->
        AuraInfoDialog(infoKey = key) {
            activeInfoKey = null
        }
    }
}

@Composable
private fun ProtocolCard(
    protocol: MeditationProtocol,
    onClick: () -> Unit,
    onInfoClick: () -> Unit
) {
    val categoryColor = CategoryColors[protocol.category] ?: Color.White

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = RoundedCornerShape(24.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.White.copy(alpha = 0.05f),
                            Color.White.copy(alpha = 0.02f)
                        )
                    )
                )
        ) {
            Column(
                modifier = Modifier.padding(14.dp)
            ) {
                // Top row: dot + info button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(categoryColor)
                    )
                    IconButton(
                        onClick = onInfoClick,
                        modifier = Modifier.size(20.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "Bilgi",
                            tint = Color.White.copy(alpha = 0.4f),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Title
                Text(
                    text = protocol.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Duration
                Text(
                    text = protocol.duration,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.5f)
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Tagline
                Text(
                    text = protocol.tagline,
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.6f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
