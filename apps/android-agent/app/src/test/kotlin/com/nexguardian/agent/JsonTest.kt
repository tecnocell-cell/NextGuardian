package com.nexguardian.agent

import com.nexguardian.agent.core.network.Json
import com.nexguardian.agent.core.network.JsonNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class JsonTest {
    @Test fun parsesNestedObject() {
        val o = Json.parseObject("""{"a":"x","n":{"b":true,"c":12.5},"d":null}""")
        assertEquals("x", o.str("a"))
        assertEquals(true, o.obj("n")?.bool("b"))
        assertEquals(12.5, o.obj("n")?.num("c")!!, 0.0)
        assertTrue(o.fields["d"] is JsonNull)
    }

    @Test fun handlesEscapesAndUnicode() {
        val o = Json.parseObject(""" {"s":"a\"b\\c\né"} """)
        assertEquals("a\"b\\c\né", o.str("s"))
    }

    @Test fun encodeParseRoundTrip() {
        val json = Json.encode(mapOf("code" to "NG-1", "deviceInfo" to mapOf("n" to "x"), "ok" to true, "b" to null, "battery" to 87))
        val o = Json.parseObject(json)
        assertEquals("NG-1", o.str("code"))
        assertEquals("x", o.obj("deviceInfo")?.str("n"))
        assertEquals(true, o.bool("ok"))
        assertTrue(o.fields["b"] is JsonNull)
        assertEquals(87.0, o.num("battery")!!, 0.0)
    }

    @Test fun encodesEscapedString() {
        assertEquals("\"a\\\"b\"", Json.encode("a\"b"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsTrailingContent() { Json.parse("{}x") }
}
