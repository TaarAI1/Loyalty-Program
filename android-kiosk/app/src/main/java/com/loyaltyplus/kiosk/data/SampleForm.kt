package com.loyaltyplus.kiosk.data

/**
 * Placeholder form so the kiosk can run before LoyaltyPlus pairing APIs exist.
 * Later this is replaced by GET /api/kiosk/form for the assigned device.
 */
object SampleForm {
    val form = SurveyForm(
        id = 1,
        name = "Store visit feedback",
        questions = listOf(
            Question(
                id = 1,
                text = "How was your visit today?",
                type = QuestionType.RATING,
            ),
            Question(
                id = 2,
                text = "How do you feel about our service?",
                type = QuestionType.EMOJI,
            ),
            Question(
                id = 3,
                text = "Would you recommend us to a friend?",
                type = QuestionType.YES_NO,
            ),
            Question(
                id = 4,
                text = "What did you like most?",
                type = QuestionType.CHOICE,
                options = listOf("Staff", "Products", "Store", "Offers"),
            ),
            Question(
                id = 5,
                text = "Any other comments?",
                type = QuestionType.TEXT,
                required = false,
            ),
        ),
    )
}
