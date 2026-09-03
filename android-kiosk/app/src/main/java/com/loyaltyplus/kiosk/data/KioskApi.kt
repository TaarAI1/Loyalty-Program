package com.loyaltyplus.kiosk.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

object KioskApi {

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; isLenient = true })
        }
        install(Logging) { level = LogLevel.BODY }
        engine { connectTimeout = 15_000; socketTimeout = 15_000 }
    }

    suspend fun connect(apiUrl: String, pairingCode: String): KioskConnectResponse {
        val base = apiUrl.trimEnd('/')
        return client.get("$base/forms/kiosk/connect") {
            parameter("code", pairingCode.trim().uppercase())
        }.body()
    }

    suspend fun submit(apiUrl: String, pairingCode: String, answers: List<Map<String, String>>) {
        val base = apiUrl.trimEnd('/')
        client.post("$base/forms/kiosk/submit") {
            contentType(ContentType.Application.Json)
            setBody(
                mapOf(
                    "pairingCode" to pairingCode.uppercase(),
                    "answers" to answers,
                )
            )
        }
    }
}
