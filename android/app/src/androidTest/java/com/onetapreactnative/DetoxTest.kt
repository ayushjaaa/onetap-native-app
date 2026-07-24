package com.onetapreactnative

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.rule.ActivityTestRule
import com.wix.detox.Detox
import com.wix.detox.config.DetoxConfig
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

// Without this class, the androidTest APK has no discoverable JUnit test to run,
// so `am instrument` completes with "0 tests" and Detox's native WebSocket bridge
// (Detox.runTests) never starts — the app launches but the "ready" handshake with
// the host never happens.
@RunWith(AndroidJUnit4::class)
class DetoxTest {
    @get:Rule
    var activityTestRule = ActivityTestRule(MainActivity::class.java, false, false)

    @Test
    fun runDetoxTests() {
        val detoxConfig = DetoxConfig()
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 90
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60
        detoxConfig.rnContextLoadTimeoutSec = if (BuildConfig.DEBUG) 180 else 8

        Detox.runTests(activityTestRule, detoxConfig)
    }
}
