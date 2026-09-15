package com.loyaltyplus.kiosk.data

enum class QuestionType {
    TEXT,
    EMOJI,
    RATING,
    YES_NO,
    CHOICE,
}

data class Question(
    val id: Int,
    val text: String,
    val type: QuestionType,
    val options: List<String> = emptyList(),
    val required: Boolean = true,
)

data class SurveyForm(
    val id: Int,
    val name: String,
    val questions: List<Question>,
)

val EmojiScale = listOf(
    EmojiOption("😠", "Very Bad"),
    EmojiOption("😟", "Bad"),
    EmojiOption("😐", "Okay"),
    EmojiOption("😊", "Good"),
    EmojiOption("😄", "Excellent"),
)

data class EmojiOption(
    val emoji: String,
    val label: String,
)
