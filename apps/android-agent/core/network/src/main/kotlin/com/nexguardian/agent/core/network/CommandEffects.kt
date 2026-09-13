package com.nexguardian.agent.core.network

/** Side effects the agent performs for legitimate commands. No arbitrary execution. */
interface CommandEffects {
    fun showMessage(text: String)
    fun ring()
}

object NoOpCommandEffects : CommandEffects {
    override fun showMessage(text: String) {}
    override fun ring() {}
}
