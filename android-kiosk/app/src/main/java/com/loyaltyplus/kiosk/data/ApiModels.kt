package com.loyaltyplus.kiosk.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class KioskConnectResponse(
    val device: DeviceDto,
    val form: FormDto,
)

@Serializable
data class DeviceDto(
    val id: Int,
    val name: String,
    val store: String? = null,
    val deviceType: String = "kiosk",
)

@Serializable
data class FormDto(
    val id: Int,
    val name: String,
    val questions: List<QuestionDto>,
)

@Serializable
data class QuestionDto(
    val id: Int,
    val text: String,
    @SerialName("questionType") val questionType: String,
    val options: List<String>? = null,
    val required: Boolean = true,
)

fun QuestionDto.toQuestion() = Question(
    id = id,
    text = text,
    type = when (questionType) {
        "rating"   -> QuestionType.RATING
        "textarea" -> QuestionType.EMOJI
        "boolean"  -> QuestionType.YES_NO
        "select"   -> QuestionType.CHOICE
        else       -> QuestionType.TEXT
    },
    options = options ?: emptyList(),
    required = required,
)

fun FormDto.toSurveyForm() = SurveyForm(
    id = id,
    name = name,
    questions = questions.map { it.toQuestion() },
)
