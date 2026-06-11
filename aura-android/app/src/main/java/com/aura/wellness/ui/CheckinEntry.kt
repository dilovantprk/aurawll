package com.aura.wellness.ui

data class CheckinEntry(
    val state: String, // "ventral", "sympathetic", "dorsal"
    val note: String,
    val timestamp: Long,
    val emotions: List<String> = emptyList(),
    val somaticKeys: List<String> = emptyList(),
    val preValence: Float = 0.5f,
    val preArousal: Float = 0.5f,
    val postValence: Float? = null,
    val postArousal: Float? = null,
    val dreamQuality: String? = null, // "yes", "no", "vague"
    val awakeningState: String? = null, // "refreshed", "heavy", "neutral"
    val marinationSelections: List<String> = emptyList()
)
