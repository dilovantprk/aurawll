package com.aura.wellness.ui

sealed class Screen {
    object Welcome : Screen()
    object Auth : Screen()
    object Onboarding : Screen()
    object Dashboard : Screen()
    object Checkin : Screen()
    object Breathing : Screen()
    object Meditations : Screen()
    object Notebook : Screen()
    object Insight : Screen()
    object Settings : Screen()
    object Focus : Screen()
    object Ambient : Screen()
    object Sleep : Screen()
}
