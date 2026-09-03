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
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

object KioskApi {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private val client = HttpClient(Android) {
        install(ContentNegotiation) { json(json) }
        install(Logging) { level = LogLevel.BODY }
        engine { connectTimeout = 15_000; socketTimeout = 15_000 }
    }

    suspend fun connect(apiUrl: String, pairingCode: String): KioskConnectResponse {
        val base = apiUrl.trimEnd('/')
        val response = client.get("$base/forms/kiosk/connect") {
            parameter("code", pairingCode.trim().uppercase())
        }
        if (!response.status.isSuccess()) {
            val body = response.bodyAsText()
            val message = try {
                json.parseToJsonElement(body).jsonObject["message"]?.jsonPrimitive?.content
                    ?: "HTTP ${response.status.value}"
            } catch (_: Exception) {
                "HTTP ${response.status.value}"
            }
            throw Exception(message)
        }
        return response.body()
    }

    suspend fun submit(apiUrl: String, pairingCode: String, answers: List<Map<String, String>>) {
        val base = apiUrl.trimEnd('/')
        client.post("$base/forms/kiosk/submit") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("pairingCode" to pairingCode.uppercase(), "answers" to answers))
        }
    }
}
