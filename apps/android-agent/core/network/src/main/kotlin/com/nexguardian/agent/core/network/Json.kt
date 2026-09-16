package com.nexguardian.agent.core.network

/** Minimal dependency-free JSON, sufficient for the NextGuardian contract payloads. */
sealed interface JsonValue

data class JsonObject(val fields: Map<String, JsonValue>) : JsonValue {
    fun str(key: String): String? = (fields[key] as? JsonString)?.value
    fun obj(key: String): JsonObject? = fields[key] as? JsonObject
    fun bool(key: String): Boolean? = (fields[key] as? JsonBool)?.value
    fun num(key: String): Double? = (fields[key] as? JsonNumber)?.value
}

data class JsonArray(val items: List<JsonValue>) : JsonValue
data class JsonString(val value: String) : JsonValue
data class JsonNumber(val value: Double) : JsonValue
data class JsonBool(val value: Boolean) : JsonValue
data object JsonNull : JsonValue

object Json {
    fun parse(text: String): JsonValue {
        val parser = Parser(text)
        val value = parser.parseValue()
        parser.skipWhitespace()
        require(parser.atEnd()) { "Trailing content in JSON" }
        return value
    }

    fun parseObject(text: String): JsonObject =
        parse(text) as? JsonObject ?: throw IllegalArgumentException("Expected a JSON object")

    /** Encodes a request body. Supports String, Boolean, Number, null, List and Map<String, Any?> (nested). */
    fun encode(value: Any?): String = buildString { write(value, this) }

    private fun write(value: Any?, out: StringBuilder) {
        when (value) {
            null -> out.append("null")
            is String -> writeString(value, out)
            is Boolean -> out.append(value.toString())
            is Int -> out.append(value.toString())
            is Long -> out.append(value.toString())
            is Double -> out.append(value.toString())
            is List<*> -> {
                out.append('[')
                for ((index, item) in value.withIndex()) {
                    if (index > 0) out.append(',')
                    write(item, out)
                }
                out.append(']')
            }
            is Map<*, *> -> {
                out.append('{')
                var first = true
                for ((k, v) in value) {
                    if (!first) out.append(',')
                    first = false
                    writeString(k.toString(), out)
                    out.append(':')
                    write(v, out)
                }
                out.append('}')
            }
            else -> throw IllegalArgumentException("Unsupported JSON value type: ${value::class}")
        }
    }

    private fun writeString(value: String, out: StringBuilder) {
        out.append('"')
        for (ch in value) {
            when (ch) {
                '"' -> out.append("\\\"")
                '\\' -> out.append("\\\\")
                '\n' -> out.append("\\n")
                '\r' -> out.append("\\r")
                '\t' -> out.append("\\t")
                '\b' -> out.append("\\b")
                '' -> out.append("\\f")
                else -> if (ch < ' ') out.append("\\u%04x".format(ch.code)) else out.append(ch)
            }
        }
        out.append('"')
    }

    private class Parser(private val s: String) {
        private var i = 0
        fun atEnd(): Boolean = i >= s.length
        fun skipWhitespace() { while (i < s.length && s[i].isWhitespace()) i++ }

        fun parseValue(): JsonValue {
            skipWhitespace()
            require(i < s.length) { "Unexpected end of JSON" }
            return when (s[i]) {
                '{' -> parseObject()
                '[' -> parseArray()
                '"' -> JsonString(parseString())
                't', 'f' -> parseBool()
                'n' -> parseNull()
                else -> parseNumber()
            }
        }

        private fun parseObject(): JsonObject {
            expect('{')
            val map = LinkedHashMap<String, JsonValue>()
            skipWhitespace()
            if (peek() == '}') { i++; return JsonObject(map) }
            while (true) {
                skipWhitespace()
                val key = parseString()
                skipWhitespace()
                expect(':')
                map[key] = parseValue()
                skipWhitespace()
                when (next()) {
                    ',' -> continue
                    '}' -> break
                    else -> throw IllegalArgumentException("Expected ',' or '}' in object")
                }
            }
            return JsonObject(map)
        }

        private fun parseArray(): JsonArray {
            expect('[')
            val items = ArrayList<JsonValue>()
            skipWhitespace()
            if (peek() == ']') { i++; return JsonArray(items) }
            while (true) {
                items.add(parseValue())
                skipWhitespace()
                when (next()) {
                    ',' -> continue
                    ']' -> break
                    else -> throw IllegalArgumentException("Expected ',' or ']' in array")
                }
            }
            return JsonArray(items)
        }

        private fun parseString(): String {
            expect('"')
            val sb = StringBuilder()
            while (true) {
                require(i < s.length) { "Unterminated string" }
                val ch = s[i++]
                when (ch) {
                    '"' -> return sb.toString()
                    '\\' -> {
                        val esc = s[i++]
                        when (esc) {
                            '"' -> sb.append('"'); '\\' -> sb.append('\\'); '/' -> sb.append('/')
                            'n' -> sb.append('\n'); 'r' -> sb.append('\r'); 't' -> sb.append('\t')
                            'b' -> sb.append('\b'); 'f' -> sb.append('')
                            'u' -> { sb.append(s.substring(i, i + 4).toInt(16).toChar()); i += 4 }
                            else -> throw IllegalArgumentException("Invalid escape \\$esc")
                        }
                    }
                    else -> sb.append(ch)
                }
            }
        }

        private fun parseNumber(): JsonNumber {
            val start = i
            while (i < s.length && (s[i].isDigit() || s[i] in "+-.eE")) i++
            return JsonNumber(s.substring(start, i).toDouble())
        }

        private fun parseBool(): JsonBool =
            if (s.startsWith("true", i)) { i += 4; JsonBool(true) }
            else if (s.startsWith("false", i)) { i += 5; JsonBool(false) }
            else throw IllegalArgumentException("Invalid literal")

        private fun parseNull(): JsonValue {
            require(s.startsWith("null", i)) { "Invalid literal" }
            i += 4
            return JsonNull
        }

        private fun peek(): Char = s[i]
        private fun next(): Char = s[i++]
        private fun expect(c: Char) { require(i < s.length && s[i] == c) { "Expected '$c'" }; i++ }
    }
}
