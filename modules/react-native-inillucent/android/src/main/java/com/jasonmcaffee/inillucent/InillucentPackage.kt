package com.jasonmcaffee.inillucent

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers the Inillucent native module with React Native; autolinking adds it to the app. */
class InillucentPackage : ReactPackage {
    /**
     * The native modules this package provides.
     * @param reactContext - the application's React context
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(InillucentModule(reactContext))

    /**
     * The view managers this package provides: none.
     * @param reactContext - the application's React context
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
