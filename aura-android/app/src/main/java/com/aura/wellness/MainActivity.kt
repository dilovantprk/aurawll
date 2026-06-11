package com.aura.wellness

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import com.aura.wellness.ui.AuraBackground
import com.aura.wellness.ui.AuraHeader
import com.aura.wellness.ui.AuraNavigationBar
import com.aura.wellness.ui.BreathingScreen
import com.aura.wellness.ui.CheckinEntry
import com.aura.wellness.ui.CheckinScreen
import com.aura.wellness.ui.DashboardScreen
import com.aura.wellness.ui.NotebookScreen
import com.aura.wellness.ui.Screen
import com.aura.wellness.ui.SettingsScreen
import com.aura.wellness.ui.WelcomeScreen
import com.aura.wellness.ui.AuthScreen
import com.aura.wellness.ui.FocusScreen
import com.aura.wellness.ui.AmbientScreen
import com.aura.wellness.ui.SleepScreen
import com.aura.wellness.ui.OnboardingScreen
import com.aura.wellness.ui.InsightScreen
import com.aura.wellness.ui.MeditationsScreen
import com.aura.wellness.ui.theme.AuraTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Programmatic Firebase Initialization
        try {
            val options = FirebaseOptions.Builder()
                .setApiKey("AIzaSyDyKkPP2VD0iipS2Q7LU525KuhhLdaVoV4")
                .setApplicationId("1:333658445431:android:aura.wellness")
                .setProjectId("aura-65c3a")
                .setStorageBucket("aura-65c3a.firebasestorage.app")
                .setGcmSenderId("333658445431")
                .build()

            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this, options)
                android.util.Log.d("AuraFirebase", "Firebase initialized programmatically.")
            }

            // Anonymous Sign-In on startup disabled to respect the Auth Screen.
            // Authentication will be handled by the Auth Screen instead.

            // FCM Push Token logging
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    android.util.Log.w("AuraFirebase", "FCM token fetch failed", task.exception)
                    return@addOnCompleteListener
                }
                android.util.Log.d("AuraFirebase", "FCM registration token: ${task.result}")
            }
        } catch (e: Exception) {
            android.util.Log.w("AuraFirebase", "Firebase startup config omitted or failed safely", e)
        }

        setContent {
            AuraTheme {
                val context = androidx.compose.ui.platform.LocalContext.current
                val prefs = remember { AuraPreferences(context) }

                val checkinHistory = remember {
                    mutableStateListOf<CheckinEntry>().apply {
                        addAll(prefs.loadHistory())
                    }
                }
                val lastVagalState = checkinHistory.firstOrNull()?.state
                
                var currentScreen by remember {
                    mutableStateOf<Screen>(
                        if (!prefs.isOnboardingCompleted()) {
                            Screen.Welcome
                        } else if (FirebaseAuth.getInstance().currentUser == null) {
                            Screen.Auth
                        } else {
                            Screen.Dashboard
                        }
                    )
                }

                var activeBreathingProtocolId by remember { mutableStateOf<String?>(null) }

                // Aura+ Module States
                var showNotebook by remember { mutableStateOf(prefs.isModuleActive("notebook")) }
                var showFocus by remember { mutableStateOf(prefs.isModuleActive("focus")) }
                var showAmbient by remember { mutableStateOf(prefs.isModuleActive("ambient")) }
                var showSleep by remember { mutableStateOf(prefs.isModuleActive("sleep")) }

                var unlockedFocus by remember { mutableStateOf(prefs.isModuleUnlocked("focus")) }
                var unlockedAmbient by remember { mutableStateOf(prefs.isModuleUnlocked("ambient")) }
                var unlockedSleep by remember { mutableStateOf(prefs.isModuleUnlocked("sleep")) }

                Box(modifier = Modifier.fillMaxSize()) {
                    AuraBackground(vagalState = if (currentScreen is Screen.Welcome || currentScreen is Screen.Onboarding || currentScreen is Screen.Auth) null else lastVagalState)

                    Scaffold(
                        topBar = {
                            if (currentScreen !is Screen.Welcome && currentScreen !is Screen.Onboarding && currentScreen !is Screen.Checkin && currentScreen !is Screen.Auth) {
                                AuraHeader(currentScreen = currentScreen)
                            }
                        },
                        bottomBar = {
                            if (currentScreen !is Screen.Welcome && currentScreen !is Screen.Onboarding && currentScreen !is Screen.Checkin && currentScreen !is Screen.Auth) {
                                AuraNavigationBar(
                                    currentScreen = currentScreen,
                                    showNotebook = showNotebook,
                                    showFocus = showFocus,
                                    showAmbient = showAmbient,
                                    showSleep = showSleep,
                                    onNavigate = { screen ->
                                        currentScreen = screen
                                    }
                                )
                            }
                        },
                        containerColor = Color.Transparent
                    ) { innerPadding ->
                        Surface(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding),
                            color = Color.Transparent
                        ) {
                            when (currentScreen) {
                                is Screen.Welcome -> {
                                    WelcomeScreen(
                                        onUnlock = {
                                            if (FirebaseAuth.getInstance().currentUser == null) {
                                                currentScreen = Screen.Auth
                                            } else if (prefs.isOnboardingCompleted()) {
                                                currentScreen = Screen.Dashboard
                                            } else {
                                                currentScreen = Screen.Onboarding
                                            }
                                        }
                                    )
                                }
                                is Screen.Auth -> {
                                    AuthScreen(
                                        onAuthSuccess = {
                                            if (prefs.isOnboardingCompleted()) {
                                                currentScreen = Screen.Dashboard
                                            } else {
                                                currentScreen = Screen.Onboarding
                                            }
                                        }
                                    )
                                }
                                is Screen.Onboarding -> {
                                    OnboardingScreen(
                                        onComplete = {
                                            prefs.setOnboardingCompleted(true)
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Dashboard -> {
                                    DashboardScreen(
                                        lastState = lastVagalState,
                                        recentEntries = checkinHistory,
                                        showNotebook = showNotebook,
                                        showFocus = showFocus,
                                        showAmbient = showAmbient,
                                        showSleep = showSleep,
                                        unlockedFocus = unlockedFocus,
                                        unlockedAmbient = unlockedAmbient,
                                        unlockedSleep = unlockedSleep,
                                        onToggleModule = { modId ->
                                            when (modId) {
                                                "notebook" -> {
                                                    showNotebook = !showNotebook
                                                    prefs.setModuleActive("notebook", showNotebook)
                                                }
                                                "focus" -> {
                                                    if (!unlockedFocus) {
                                                        unlockedFocus = true
                                                        showFocus = true
                                                        prefs.setModuleUnlocked("focus", true)
                                                        prefs.setModuleActive("focus", true)
                                                    } else {
                                                        showFocus = !showFocus
                                                        prefs.setModuleActive("focus", showFocus)
                                                    }
                                                }
                                                "ambient" -> {
                                                    if (!unlockedAmbient) {
                                                        unlockedAmbient = true
                                                        showAmbient = true
                                                        prefs.setModuleUnlocked("ambient", true)
                                                        prefs.setModuleActive("ambient", true)
                                                    } else {
                                                        showAmbient = !showAmbient
                                                        prefs.setModuleActive("ambient", showAmbient)
                                                    }
                                                }
                                                "sleep" -> {
                                                    if (!unlockedSleep) {
                                                        unlockedSleep = true
                                                        showSleep = true
                                                        prefs.setModuleUnlocked("sleep", true)
                                                        prefs.setModuleActive("sleep", true)
                                                    } else {
                                                        showSleep = !showSleep
                                                        prefs.setModuleActive("sleep", showSleep)
                                                    }
                                                }
                                            }
                                        },
                                        onNavigateToCheckin = {
                                            currentScreen = Screen.Checkin
                                        },
                                        onNavigateToBreathing = {
                                            activeBreathingProtocolId = null
                                            currentScreen = Screen.Breathing
                                        },
                                        onNavigateToNotebook = {
                                            currentScreen = Screen.Notebook
                                        },
                                        onNavigateToSettings = {
                                            currentScreen = Screen.Settings
                                        },
                                        onNavigateToSOS = {
                                            activeBreathingProtocolId = "p_478"
                                            currentScreen = Screen.Breathing
                                        },
                                        onNavigateToInsight = {
                                            currentScreen = Screen.Insight
                                        },
                                        onNavigateToMeditations = {
                                            currentScreen = Screen.Meditations
                                        }
                                    )
                                }
                                is Screen.Checkin -> {
                                    CheckinScreen(
                                        recentEntries = checkinHistory,
                                        onCompleteCheckin = { entry ->
                                            checkinHistory.add(0, entry)
                                            prefs.saveHistory(checkinHistory)
                                            syncCheckinToFirestore(entry)
                                            currentScreen = Screen.Dashboard
                                        },
                                        onBack = {
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Breathing -> {
                                    BreathingScreen(
                                        initialProtocolId = activeBreathingProtocolId,
                                        onBack = {
                                            activeBreathingProtocolId = null
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Meditations -> {
                                    MeditationsScreen(
                                        onSelectProtocol = { protoId ->
                                            activeBreathingProtocolId = protoId
                                            currentScreen = Screen.Breathing
                                        },
                                        onBack = {
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Insight -> {
                                    InsightScreen(
                                        recentEntries = checkinHistory,
                                        onBack = {
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Notebook -> {
                                    NotebookScreen(
                                        entries = checkinHistory,
                                        onDeleteEntry = { index ->
                                             if (index in checkinHistory.indices) {
                                                 val entry = checkinHistory[index]
                                                 checkinHistory.removeAt(index)
                                                 prefs.saveHistory(checkinHistory)
                                                 deleteCheckinFromFirestore(entry.timestamp)
                                             }
                                         }
                                    )
                                }
                                is Screen.Focus -> {
                                    FocusScreen(
                                        onBack = {
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Ambient -> {
                                    AmbientScreen(
                                        onBack = {
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Sleep -> {
                                    SleepScreen(
                                        onBack = {
                                            currentScreen = Screen.Dashboard
                                        }
                                    )
                                }
                                is Screen.Settings -> {
                                    SettingsScreen(
                                        checkinHistory = checkinHistory,
                                        showNotebook = showNotebook,
                                        showFocus = showFocus,
                                        showAmbient = showAmbient,
                                        showSleep = showSleep,
                                        onToggleTab = { modId ->
                                            when (modId) {
                                                "notebook" -> {
                                                    showNotebook = !showNotebook
                                                    prefs.setModuleActive("notebook", showNotebook)
                                                }
                                                "focus" -> {
                                                    showFocus = !showFocus
                                                    prefs.setModuleActive("focus", showFocus)
                                                }
                                                "ambient" -> {
                                                    showAmbient = !showAmbient
                                                    prefs.setModuleActive("ambient", showAmbient)
                                                }
                                                "sleep" -> {
                                                    showSleep = !showSleep
                                                    prefs.setModuleActive("sleep", showSleep)
                                                }
                                            }
                                        },
                                          onResetMemory = {
                                              FirebaseAuth.getInstance().signOut()
                                              checkinHistory.clear()
                                             prefs.clearAll()
                                             clearFirestoreData()
                                             // Reset active states
                                             showNotebook = true
                                             showFocus = false
                                             showAmbient = false
                                             showSleep = false
                                             unlockedFocus = false
                                             unlockedAmbient = false
                                             unlockedSleep = false
                                             currentScreen = Screen.Welcome
                                         },
                                        onNavigateToWelcome = {
                                            prefs.setOnboardingCompleted(false)
                                            currentScreen = Screen.Welcome
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun syncCheckinToFirestore(entry: CheckinEntry) {
        try {
            val currentUser = FirebaseAuth.getInstance().currentUser
            if (currentUser != null) {
                val db = FirebaseFirestore.getInstance()
                val userHistoryRef = db.collection("users").document(currentUser.uid).collection("history")
                val data = hashMapOf(
                    "state" to entry.state,
                    "note" to entry.note,
                    "timestamp" to entry.timestamp,
                    "emotions" to entry.emotions,
                    "somaticKeys" to entry.somaticKeys,
                    "preValence" to entry.preValence,
                    "preArousal" to entry.preArousal,
                    "dreamQuality" to entry.dreamQuality,
                    "awakeningState" to entry.awakeningState,
                    "marinationSelections" to entry.marinationSelections
                )
                userHistoryRef.document(entry.timestamp.toString()).set(data)
                    .addOnSuccessListener {
                        android.util.Log.d("AuraFirebase", "Check-in synced to Firestore successfully.")
                    }
                    .addOnFailureListener { e ->
                        android.util.Log.w("AuraFirebase", "Failed to sync check-in to Firestore", e)
                    }
            }
        } catch (e: Exception) {
            android.util.Log.w("AuraFirebase", "Firestore sync bypassed/failed", e)
        }
    }

    private fun deleteCheckinFromFirestore(timestamp: Long) {
        try {
            val currentUser = FirebaseAuth.getInstance().currentUser
            if (currentUser != null) {
                val db = FirebaseFirestore.getInstance()
                db.collection("users").document(currentUser.uid).collection("history")
                    .document(timestamp.toString()).delete()
                    .addOnSuccessListener {
                        android.util.Log.d("AuraFirebase", "Check-in deleted from Firestore successfully.")
                    }
                    .addOnFailureListener { e ->
                        android.util.Log.w("AuraFirebase", "Failed to delete check-in from Firestore", e)
                    }
            }
        } catch (e: Exception) {
            android.util.Log.w("AuraFirebase", "Firestore delete bypassed/failed", e)
        }
    }

    private fun clearFirestoreData() {
        try {
            val currentUser = FirebaseAuth.getInstance().currentUser
            if (currentUser != null) {
                val db = FirebaseFirestore.getInstance()
                db.collection("users").document(currentUser.uid).collection("history")
                    .get()
                    .addOnSuccessListener { querySnapshot ->
                        val batch = db.batch()
                        for (doc in querySnapshot.documents) {
                            batch.delete(doc.reference)
                        }
                        batch.commit()
                            .addOnSuccessListener {
                                android.util.Log.d("AuraFirebase", "All Firestore check-ins deleted successfully.")
                            }
                    }
            }
        } catch (e: Exception) {
            android.util.Log.w("AuraFirebase", "Firestore clear bypassed/failed", e)
        }
    }
}
