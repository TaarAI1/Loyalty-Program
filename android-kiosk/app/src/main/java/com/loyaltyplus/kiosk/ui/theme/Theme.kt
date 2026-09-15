package com.loyaltyplus.kiosk.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val Scheme = lightColorScheme(
    primary = Gold,
    onPrimary = Ink,
    secondary = Ink,
    onSecondary = Gold,
    background = Paper,
    onBackground = Ink,
    surface = White,
    onSurface = Ink,
    error = Danger,
    outline = Line,
)

@Composable
fun LoyaltyPlusTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = Scheme,
        typography = Typography,
        content = content,
    )
}
