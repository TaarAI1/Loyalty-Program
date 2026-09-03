package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink
import com.loyaltyplus.kiosk.ui.theme.Muted
import com.loyaltyplus.kiosk.ui.theme.Paper
import kotlinx.coroutines.delay

@Composable
fun ThankYouScreen(onDone: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(4_000)
        onDone()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper)
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(Gold),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = null,
                    tint = Ink,
                    modifier = Modifier.size(52.dp),
                )
            }
            Spacer(Modifier.height(28.dp))
            Text(
                text = "Thank you",
                fontSize = 40.sp,
                fontWeight = FontWeight.Black,
                color = Ink,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Your feedback helps us serve you better.",
                fontSize = 18.sp,
                color = Muted,
                textAlign = TextAlign.Center,
            )
        }
    }
}
