package com.aura.wellness.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

data class AuraInfoContent(
    val title: String,
    val body: String,
    val reference: String
)

object AuraInfoArchive {
    private val data = mapOf(
        "heatmap" to AuraInfoContent(
            title = "Nöral Durum Dağılımı",
            body = "Sinir sistemi durumlarınızın (Ventral, Sempatik, Dorsal) uzun vadeli dağılımını haritalandırır. Bu analiz, temel fizyolojik eşiğinizi ve zaman içindeki regülasyon eğilimlerinizi belirler.",
            reference = "Russell (1980) / Porges (2011)"
        ),
        "resilience" to AuraInfoContent(
            title = "Vagal Plastisite Akışı",
            body = "Fizyolojik esnekliğinizi ölçer; sisteminizin durumlar arası geçiş yapabilme hızını ve kolaylığını gösterir. Yüksek plastisite, dayanıklı bir sinir sistemine işaret eder.",
            reference = "Porges (2007)"
        ),
        "insight" to AuraInfoContent(
            title = "Aura Nöral Analiz",
            body = "Aura'nın nöral motoru, biyometrik verilerinizi analiz ederek sirkadiyen ritimlerinizi tanımlar ve size özel en etkili regülasyon yollarını önerir.",
            reference = "Antigravity Neural Engine v2"
        ),
        "vagal_analysis" to AuraInfoContent(
            title = "Nöral Derin Analiz",
            body = "Bu analiz, son check-in verilerinize dayanarak otonom sinir sisteminizin temel eğilimlerini yansıtır. Örüntüleriniz, strese nasıl uyum sağladığınızı ve zaman içinde nasıl dinlendiğinizi ortaya koyar.",
            reference = "Aura Nöral Motoru v2"
        ),
        "exercise" to AuraInfoContent(
            title = "Vagal Protokol Analizi",
            body = "Sisteminiz için en etkili fizyolojik kaldıraç noktasıdır. Bu protokol, biyolojik tepki sıklığınıza ve başarı oranınıza göre dinamik olarak seçilir.",
            reference = "Zaccaro et al. (2018)"
        ),
        "focus" to AuraInfoContent(
            title = "Odak: Nöral Uyumlanma",
            body = "Aura Odak, otonom regülasyonla senkronize edilmiş Pomodoro döngülerini (25/5) kullanır. Binaural frekanslar ve biyo-akustik drone sesleri ekleyerek 'Akış Hali'ni (Flow State) kolaylaştırırken, planlı ventral molalarla sempatik tükenmişliği önler.",
            reference = "Csikszentmihalyi (1990) / Porges (2011)"
        ),
        "ambient" to AuraInfoContent(
            title = "Ambiyans: İşitsel Topraklama",
            body = "Akustik ortamlar, beyin sapına güvenlik sinyali gönderen frekansları vurgulayacak şekilde filtrelenir. Bu ses manzaraları, interoseptif farkındalığı artırmak için uzamsal ses (spatial audio) kullanır; amigdalayı yatıştırır ve kortizol seviyelerini düşürür.",
            reference = "Thayer et al. (2012) / Aura Sound Engine"
        ),
        "sleep" to AuraInfoContent(
            title = "Uyku: Otonom Kapanma",
            body = "Uyku modülü, sinir sistemini aktif teyakkuz halinden güvenli dorsal dinlenme haline geçirmek için NSDR (Uykusuz Derin Dinlenme) ve CBT-i prensiplerini kullanır. Derin toparlanma ve melatonin üretimi için gereken fizyolojik değişimi vurgular.",
            reference = "Huberman (2021) / CBT-i Protokolleri"
        ),
        "meditations" to AuraInfoContent(
            title = "Nefes ve Meditasyon",
            body = "Otonom sinir sisteminizi düzenlemek için tasarlanmış rehberli seanslar. Belirli ritmik nefes kalıpları kullanarak durumunuzu stres (sempatik) veya kapanma (dorsal) halinden, güvenli sosyal katılım (ventral) haline manuel olarak taşıyabilirsiniz.",
            reference = "Porges (2011) / Nöral Düzenleme"
        ),
        "notebook" to AuraInfoContent(
            title = "Somatik Günlük Tutma",
            body = "İçsel durumlarınızı ve duyumlarınızı not etmek güçlü bir geri bildirim döngüsü oluşturur. 'İnteroseptif Etiketleme' olarak bilinen bu pratik, beden ve zihin arasındaki boşluğu köprüleyerek gelecekteki öz-düzenlemeyi daha kolay ve sezgisel hale getirir.",
            reference = "Levine (1997) / Somatic Deneyimleme"
        ),
        "step1" to AuraInfoContent(
            title = "Somatik Sinyal Girişi",
            body = "Fiziksel duyumlara (kalp hızı, kas gerginliği vb.) odaklanmak, bilişsel önyargıları devre dışı bırakarak gerçek biyolojik durumunuzu hassasiyetle belirler.",
            reference = "Levine (1997) / Gendlin (1982)"
        ),
        "step2" to AuraInfoContent(
            title = "Duygu Haritası",
            body = "Enerji ve rahatlık düzeyinizi Russell'ın döngüsel modeli üzerinde işaretlemek, o anki fizyolojik konumunuzun çok boyutlu bir anlık görüntüsünü çıkarır.",
            reference = "Russell (1980)"
        ),
        "step2b" to AuraInfoContent(
            title = "Duyguları İsimlendirme",
            body = "Soyut duyumları dile dökmek, ön frontal korteksi aktive ederek amigdaladan gelen stres tepkilerini doğrudan yönetir ve yatıştırır.",
            reference = "Lieberman et al. (2007)"
        ),
        "step3" to AuraInfoContent(
            title = "Vagal Regülasyon",
            body = "Hedef odaklı nefes protokolleri, vagus siniri ve akciğer reseptörleri üzerinde fiziksel baskı kurarak otonom sinir sisteminde anlık bir değişim zorlar.",
            reference = "Porges (2011)"
        ),
        "step4" to AuraInfoContent(
            title = "Sinyal Entegrasyonu",
            body = "Regülasyon sonrası bedendeki değişimi bilinçli olarak fark etmek, gelecekteki iyileşme hızını artıran interoseptif nöro-yolları güçlendirir.",
            reference = "Craig (2003) / Pollatos (2007)"
        ),
        "step5" to AuraInfoContent(
            title = "Duyumları Ayrıştırma",
            body = "Biyolojik değişimleri kategorize etmek, beynin bu sistemik dönüşümleri uzun vadeli öz-regülasyon modellerine entegre etmesini sağlar.",
            reference = "Damasio (2010)"
        ),
        "step6" to AuraInfoContent(
            title = "İyi Hissi Bedene Yaymak",
            body = "Regüle olmuş durumu, olumlu bir sinyale odaklanarak sabitleyin. Bu kasıtlı odak, beynin doğuştan gelen olumsuzluk önyargısını (negativity bias) kırar.",
            reference = "Hanson (2013) / Bryant (2006)"
        )
    )

    fun get(key: String): AuraInfoContent? {
        val cleanKey = key.lowercase()
            .replace("info_", "")
            .replace("_desc", "")
            .replace("_title", "")
            .replace("_body", "")
        return data[cleanKey] ?: data.entries.firstOrNull { it.key.contains(cleanKey) || cleanKey.contains(it.key) }?.value
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuraInfoDialog(
    infoKey: String,
    onDismiss: () -> Unit
) {
    val content = AuraInfoArchive.get(infoKey) ?: return
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color(0xFF13151D).copy(alpha = 0.95f),
        contentColor = Color.White,
        dragHandle = {
            BottomSheetDefaults.DragHandle(
                color = Color.White.copy(alpha = 0.15f)
            )
        },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        tonalElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .fillMaxWidth()
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = "Bilgi",
                tint = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.size(36.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = content.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = content.body,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center,
                lineHeight = 22.sp
            )

            Spacer(modifier = Modifier.height(20.dp))

            if (content.reference.isNotEmpty()) {
                Text(
                    text = "Referans: ${content.reference}",
                    style = MaterialTheme.typography.labelSmall,
                    fontStyle = FontStyle.Italic,
                    color = Color.White.copy(alpha = 0.4f),
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
            }

            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White.copy(alpha = 0.1f),
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Anladım, Kapat", fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
