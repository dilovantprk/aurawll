package com.aura.wellness

import android.content.Context
import android.content.SharedPreferences
import com.aura.wellness.ui.CheckinEntry
import org.json.JSONArray
import org.json.JSONObject

class AuraPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("aura_prefs", Context.MODE_PRIVATE)

    fun saveHistory(history: List<CheckinEntry>) {
        val array = JSONArray()
        for (entry in history) {
            val obj = JSONObject()
            obj.put("state", entry.state)
            obj.put("note", entry.note)
            obj.put("timestamp", entry.timestamp)
            
            val emotionsArr = JSONArray()
            entry.emotions.forEach { emotionsArr.put(it) }
            obj.put("emotions", emotionsArr)
            
            val somaticArr = JSONArray()
            entry.somaticKeys.forEach { somaticArr.put(it) }
            obj.put("somaticKeys", somaticArr)
            
            obj.put("preValence", entry.preValence.toDouble())
            obj.put("preArousal", entry.preArousal.toDouble())
            
            entry.postValence?.let { obj.put("postValence", it.toDouble()) }
            entry.postArousal?.let { obj.put("postArousal", it.toDouble()) }
            entry.dreamQuality?.let { obj.put("dreamQuality", it) }
            entry.awakeningState?.let { obj.put("awakeningState", it) }
            
            val marinationArr = JSONArray()
            entry.marinationSelections.forEach { marinationArr.put(it) }
            obj.put("marinationSelections", marinationArr)
            
            array.put(obj)
        }
        prefs.edit().putString("checkin_history", array.toString()).apply()
    }

    fun loadHistory(): List<CheckinEntry> {
        val historyStr = prefs.getString("checkin_history", null) ?: return emptyList()
        val list = mutableListOf<CheckinEntry>()
        try {
            val array = JSONArray(historyStr)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val state = obj.getString("state")
                val note = obj.getString("note")
                val timestamp = obj.getLong("timestamp")
                
                val emotionsList = mutableListOf<String>()
                val emotionsArr = obj.optJSONArray("emotions")
                if (emotionsArr != null) {
                    for (j in 0 until emotionsArr.length()) {
                        emotionsList.add(emotionsArr.getString(j))
                    }
                }
                
                val somaticList = mutableListOf<String>()
                val somaticArr = obj.optJSONArray("somaticKeys")
                if (somaticArr != null) {
                    for (j in 0 until somaticArr.length()) {
                        somaticList.add(somaticArr.getString(j))
                    }
                }
                
                val preValence = obj.optDouble("preValence", 0.5).toFloat()
                val preArousal = obj.optDouble("preArousal", 0.5).toFloat()
                
                val postValence = if (obj.has("postValence")) obj.getDouble("postValence").toFloat() else null
                val postArousal = if (obj.has("postArousal")) obj.getDouble("postArousal").toFloat() else null
                val dreamQuality = if (obj.has("dreamQuality")) obj.getString("dreamQuality") else null
                val awakeningState = if (obj.has("awakeningState")) obj.getString("awakeningState") else null
                
                val marinationList = mutableListOf<String>()
                val marinationArr = obj.optJSONArray("marinationSelections")
                if (marinationArr != null) {
                    for (j in 0 until marinationArr.length()) {
                        marinationList.add(marinationArr.getString(j))
                    }
                }
                
                list.add(
                    CheckinEntry(
                        state = state,
                        note = note,
                        timestamp = timestamp,
                        emotions = emotionsList,
                        somaticKeys = somaticList,
                        preValence = preValence,
                        preArousal = preArousal,
                        postValence = postValence,
                        postArousal = postArousal,
                        dreamQuality = dreamQuality,
                        awakeningState = awakeningState,
                        marinationSelections = marinationList
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun isOnboardingCompleted(): Boolean {
        return prefs.getBoolean("onboarding_completed", false)
    }

    fun setOnboardingCompleted(completed: Boolean) {
        prefs.edit().putBoolean("onboarding_completed", completed).apply()
    }

    fun isModuleUnlocked(moduleId: String): Boolean {
        return when (moduleId) {
            "notebook" -> true
            else -> prefs.getBoolean("unlocked_$moduleId", false)
        }
    }

    fun setModuleUnlocked(moduleId: String, unlocked: Boolean) {
        prefs.edit().putBoolean("unlocked_$moduleId", unlocked).apply()
    }

    fun isModuleActive(moduleId: String): Boolean {
        return when (moduleId) {
            "notebook" -> prefs.getBoolean("active_notebook", true)
            else -> prefs.getBoolean("active_$moduleId", false)
        }
    }

    fun setModuleActive(moduleId: String, active: Boolean) {
        prefs.edit().putBoolean("active_$moduleId", active).apply()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }
}
