package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.ui.Screen
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink

private val SidebarWidth = 240.dp
private val SidebarBackground = Color(0xFF0E0E1A)
private val SidebarItemHover = Color(0xFF1C1C30)
private val ScrimColor = Color(0x77000000)

@Composable
fun SidebarLayout(
    sidebarOpen: Boolean,
    activeScreen: Screen,
    onToggleSidebar: () -> Unit,
    onNavigateHome: () -> Unit,
    onNavigateSettings: () -> Unit,
    content: @Composable () -> Unit,
) {
    val sidebarOffset by animateDpAsState(
        targetValue = if (sidebarOpen) 0.dp else -SidebarWidth,
        animationSpec = tween(260),
        label = "sidebar_offset",
    )
    val scrimAlpha by animateFloatAsState(
        targetValue = if (sidebarOpen) 1f else 0f,
        animationSpec = tween(260),
        label = "scrim_alpha",
    )

    Box(modifier = Modifier.fillMaxSize()) {

        // ── Main content ──────────────────────────────────────────────────────
        content()

        // ── Hamburger button (only on Home screen) ───────────────────────────
        if (activeScreen == Screen.HOME) {
            IconButton(
                onClick = onToggleSidebar,
                modifier = Modifier
                    .padding(12.dp)
                    .align(Alignment.TopStart)
                    .size(44.dp)
                    .shadow(4.dp, RoundedCornerShape(12.dp))
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xCC000000)),
            ) {
                Icon(
                    imageVector = Icons.Filled.Menu,
                    contentDescription = "Menu",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp),
                )
            }
        }

        // ── Scrim (dims main content when sidebar open) ───────────────────────
        if (scrimAlpha > 0f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(scrimAlpha)
                    .background(ScrimColor)
                    .pointerInput(Unit) {
                        detectTapGestures(onTap = { onToggleSidebar() })
                    },
            )
        }

        // ── Sidebar drawer ────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(SidebarWidth)
                .offset(x = sidebarOffset)
                .shadow(16.dp)
                .background(SidebarBackground)
                .align(Alignment.TopStart),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {

                // Logo area
                Column(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .padding(top = 48.dp, bottom = 32.dp),
                ) {
                    Text(
                        text = "LOYALTY",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = Gold,
                        letterSpacing = 3.sp,
                    )
                    Text(
                        text = "PLUS",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 3.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .width(32.dp)
                            .height(2.dp)
                            .background(Gold),
                    )
                }

                // Divider
                Box(
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .height(1.dp)
                        .background(Color.White.copy(alpha = 0.08f))
                        .fillMaxSize(),
                )

                Spacer(Modifier.height(12.dp))

                // Home nav item
                SidebarNavItem(
                    icon = Icons.Filled.Home,
                    label = "Home",
                    selected = activeScreen == Screen.HOME,
                    onClick = onNavigateHome,
                )

                Spacer(Modifier.weight(1f))

                // Settings nav item (pinned to bottom)
                SidebarNavItem(
                    icon = Icons.Filled.Settings,
                    label = "Settings",
                    selected = activeScreen == Screen.SETTINGS_PANEL,
                    onClick = onNavigateSettings,
                )

                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

@Composable
private fun SidebarNavItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .padding(horizontal = 8.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) Gold.copy(alpha = 0.15f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (selected) Gold else Color.White.copy(alpha = 0.6f),
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.width(14.dp))
        Text(
            text = label,
            fontSize = 15.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) Gold else Color.White.copy(alpha = 0.75f),
        )
        if (selected) {
            Spacer(Modifier.weight(1f))
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(20.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Gold),
            )
        }
    }
}
