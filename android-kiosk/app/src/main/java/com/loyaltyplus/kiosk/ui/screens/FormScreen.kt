package com.loyaltyplus.kiosk.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.loyaltyplus.kiosk.data.EmojiScale
import com.loyaltyplus.kiosk.data.Question
import com.loyaltyplus.kiosk.data.QuestionType
import com.loyaltyplus.kiosk.data.SurveyForm
import com.loyaltyplus.kiosk.ui.theme.Danger
import com.loyaltyplus.kiosk.ui.theme.Gold
import com.loyaltyplus.kiosk.ui.theme.Ink
import com.loyaltyplus.kiosk.ui.theme.Line
import com.loyaltyplus.kiosk.ui.theme.White

// Crystal glass palette
private val GlassBackground = Color(0x99FFFFFF)    // 60% white — video shows through
private val GlassBorder = Color(0xAAFFFFFF)         // bright border for crystal look
private val GlassScrim = Color(0x33000022)          // very light navy — video clearly visible
private val CardShadow = Color(0x22000000)
private val ChipGlass = Color(0x55FFFFFF)           // semi-transparent chip background

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FormScreen(
    form: SurveyForm,
    questionIndex: Int,
    answers: Map<Int, String>,
    error: String?,
    isSubmitting: Boolean,
    onAnswer: (Int, String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onGoHome: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val question = form.questions.getOrNull(questionIndex) ?: return
    val isLast = questionIndex == form.questions.lastIndex
    val answer = answers[question.id].orEmpty()

    Box(modifier = Modifier.fillMaxSize()) {

        // Navy scrim layer over the video so card text is readable
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(GlassScrim)
        )

        // Back-to-home arrow (top-left)
        IconButton(
            onClick = onGoHome,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.ArrowBack,
                contentDescription = "Back to Home",
                tint = Color.White,
                modifier = Modifier.size(28.dp),
            )
        }

        // Centered crystal card
        Box(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 680.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Header with long-press settings trigger
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                ) {
                    Text(
                        text = "LOYALTYPLUS",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 4.sp,
                        color = Color.White.copy(alpha = 0.85f),
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .combinedClickable(onClick = {}, onLongClick = onOpenSettings)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                    Spacer(Modifier.height(8.dp))
                    ProgressDots(total = form.questions.size, current = questionIndex)
                }

                // Crystal card with AnimatedContent slide transition
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(28.dp))
                        .border(
                            width = 2.dp,
                            brush = Brush.verticalGradient(
                                listOf(
                                    Color.White.copy(alpha = 0.95f),
                                    Color.White.copy(alpha = 0.45f),
                                    Color.White.copy(alpha = 0.15f),
                                )
                            ),
                            shape = RoundedCornerShape(28.dp),
                        )
                        .background(GlassBackground)
                        .padding(horizontal = 28.dp, vertical = 28.dp),
                ) {
                    // Inner top shimmer line
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(2.dp)
                            .align(Alignment.TopStart)
                            .background(
                                Brush.horizontalGradient(
                                    listOf(
                                        Color.Transparent,
                                        Color.White.copy(alpha = 0.6f),
                                        Color.Transparent,
                                    )
                                )
                            )
                    )
                    AnimatedContent(
                        targetState = questionIndex,
                        transitionSpec = {
                            if (targetState > initialState) {
                                // Forward: slide in from right
                                (slideInHorizontally { it } + fadeIn()) togetherWith
                                        (slideOutHorizontally { -it } + fadeOut())
                            } else {
                                // Back: slide in from left
                                (slideInHorizontally { -it } + fadeIn()) togetherWith
                                        (slideOutHorizontally { it } + fadeOut())
                            }
                        },
                        label = "question_transition",
                    ) { idx ->
                        val q = form.questions.getOrNull(idx) ?: return@AnimatedContent
                        val a = answers[q.id].orEmpty()
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .verticalScroll(rememberScrollState()),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "Question ${idx + 1} of ${form.questions.size}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF888888),
                                letterSpacing = 0.8.sp,
                            )
                            Spacer(Modifier.height(12.dp))
                            Text(
                                text = q.text,
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Black,
                                color = Ink,
                                textAlign = TextAlign.Center,
                                lineHeight = 32.sp,
                                modifier = Modifier.fillMaxWidth(),
                            )
                            if (!q.required) {
                                Spacer(Modifier.height(4.dp))
                                Text("Optional", color = Color(0xFF999999), fontSize = 13.sp)
                            }
                            Spacer(Modifier.height(24.dp))
                            QuestionInput(question = q, answer = a, onAnswer = { onAnswer(q.id, it) }, onNext = onNext)
                        }
                    }
                }

                // Error message
                AnimatedVisibility(visible = !error.isNullOrBlank()) {
                    Text(
                        text = error.orEmpty(),
                        color = Danger,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }

                Spacer(Modifier.height(20.dp))

                // Navigation buttons
                Row(
                    modifier = Modifier
                        .widthIn(max = 680.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (questionIndex > 0) {
                        OutlinedButton(
                            onClick = onBack,
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 56.dp),
                            shape = RoundedCornerShape(16.dp),
                        Button(
                            onClick = onBack,
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 56.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0x44FFFFFF),
                                contentColor = Color.White,
                            ),
                            border = BorderStroke(
                                1.5.dp,
                                Color.White.copy(alpha = 0.85f),
                            ),
                        ) {
                            Text("Back", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        }
                    }
                    Button(
                        onClick = onNext,
                        enabled = !isSubmitting,
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Ink,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                if (isLast) "Submit" else "Next",
                                fontWeight = FontWeight.Black,
                                fontSize = 17.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProgressDots(total: Int, current: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(total) { index ->
            Box(
                modifier = Modifier
                    .size(if (index == current) 10.dp else 7.dp)
                    .clip(CircleShape)
                    .background(
                        if (index <= current) Gold else Color.White.copy(alpha = 0.3f)
                    ),
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuestionInput(
    question: Question,
    answer: String,
    onAnswer: (String) -> Unit,
    onNext: () -> Unit,
) {
    when (question.type) {
        QuestionType.RATING -> {
            Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                (1..5).forEach { star ->
                    val selected = (answer.toIntOrNull() ?: 0) >= star
                    IconButton(
                        onClick = { onAnswer(star.toString()) },
                        modifier = Modifier.size(64.dp),
                    ) {
                        Icon(
                            imageVector = if (selected) Icons.Filled.Star else Icons.Outlined.Star,
                            contentDescription = "$star stars",
                            tint = if (selected) Gold else Color.White.copy(alpha = 0.35f),
                            modifier = Modifier.size(50.dp),
                        )
                    }
                }
            }
        }

        QuestionType.EMOJI -> {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                EmojiScale.forEach { option ->
                    val selected = answer == option.label
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .width(88.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .border(
                                width = if (selected) 3.dp else 1.5.dp,
                                brush = Brush.verticalGradient(
                                    if (selected) listOf(Gold, Gold.copy(alpha = 0.6f))
                                    else listOf(Color.White.copy(alpha = 0.6f), Color.White.copy(alpha = 0.2f))
                                ),
                                shape = RoundedCornerShape(16.dp),
                            )
                            .background(if (selected) Gold.copy(alpha = 0.3f) else ChipGlass)
                            .clickable { onAnswer(option.label) }
                            .padding(vertical = 12.dp),
                    ) {
                        Text(text = option.emoji, fontSize = 36.sp)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = option.label,
                            fontSize = 11.sp,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                            color = if (selected) Ink else Color.White,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }

        QuestionType.YES_NO -> {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                CrystalChoiceChip("Yes", answer == "Yes", Modifier.weight(1f), textColor = Ink) { onAnswer("Yes") }
                CrystalChoiceChip("No", answer == "No", Modifier.weight(1f), textColor = Ink) { onAnswer("No") }
            }
        }

        QuestionType.CHOICE -> {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                question.options.forEach { option ->
                    CrystalChoiceChip(option, answer == option, Modifier.fillMaxWidth()) { onAnswer(option) }
                }
            }
        }

        QuestionType.TEXT -> {
            OutlinedTextField(
                value = answer,
                onValueChange = onAnswer,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 130.dp),
                placeholder = { Text("Type here…", color = Color(0xAAFFFFFF)) },
                shape = RoundedCornerShape(14.dp),
                keyboardOptions = KeyboardOptions(
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(
                    onDone = { onNext() },
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Gold,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.4f),
                    focusedContainerColor = Color(0x44FFFFFF),
                    unfocusedContainerColor = Color(0x33FFFFFF),
                    cursorColor = Gold,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
            )
        }
    }
}

@Composable
private fun CrystalChoiceChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    textColor: Color? = null,
    onClick: () -> Unit,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .heightIn(min = 62.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) Gold else ChipGlass)
            .border(
                width = if (selected) 0.dp else 1.5.dp,
                brush = Brush.verticalGradient(
                    listOf(
                        Color.White.copy(alpha = 0.7f),
                        Color.White.copy(alpha = 0.2f),
                    )
                ),
                shape = RoundedCornerShape(16.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Text(
            text = label,
            fontSize = 19.sp,
            fontWeight = FontWeight.Bold,
            color = textColor ?: (if (selected) Ink else Gold),
            textAlign = TextAlign.Center,
        )
    }
}
