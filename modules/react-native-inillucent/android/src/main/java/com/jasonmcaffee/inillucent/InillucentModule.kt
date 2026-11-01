package com.jasonmcaffee.inillucent

import com.blackrainbowlabs.inillucent.Connection
import com.blackrainbowlabs.inillucent.Database
import com.blackrainbowlabs.inillucent.Inillucent
import com.blackrainbowlabs.inillucent.InillucentException
import com.blackrainbowlabs.inillucent.Rows
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/** One open database and the one connection the bridge runs every statement on. */
private class OpenDatabase(val database: Database, val connection: Connection)

/**
 * The `Inillucent` native module: opens inillucent databases and runs SQL on them for JavaScript.
 * Every database id owns one database and one connection. The inillucent library serialises calls
 * on one database with its own lock, so the methods are safe on any thread.
 */
class InillucentModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val databases = ConcurrentHashMap<Int, OpenDatabase>()
    private val nextId = AtomicInteger(1)

    /** The name JavaScript reaches this module by: NativeModules.Inillucent. */
    override fun getName(): String = "Inillucent"

    /**
     * Resolves the engine's version string.
     * @param promise - resolved with the version
     */
    @ReactMethod
    fun version(promise: Promise) = settle(promise) { Inillucent.version() }

    /**
     * Opens (and creates when absent) a database file and resolves a numeric id for it.
     * @param path - the database file; its folder is created when missing
     * @param key - an encryption key, or null for a plaintext file
     * @param promise - resolved with the database id
     */
    @ReactMethod
    fun open(path: String, key: String?, promise: Promise) = settle(promise) {
        File(path).parentFile?.mkdirs()
        val database = Database.open(path, key = key)
        val connection = try { database.session() } catch (failure: Throwable) { database.close(); throw failure }
        val id = nextId.getAndIncrement()
        databases[id] = OpenDatabase(database, connection)
        id
    }

    /**
     * Runs one statement with its parameters bound to ?1, ?2 ... and resolves its rows.
     * @param id - the database id open() resolved
     * @param sql - the statement
     * @param params - the values: null, number, string or boolean
     * @param promise - resolved with {columns, rows, changes}
     */
    @ReactMethod
    fun execute(id: Double, sql: String, params: ReadableArray, promise: Promise) = settle(promise) {
        val rows = live(id).connection.query(sql, readParams(params))
        writeRows(rows)
    }

    /**
     * Runs several statements separated by semicolons, for their effect.
     * @param id - the database id
     * @param sql - the statements
     * @param promise - resolved with null
     */
    @ReactMethod
    fun executeBatch(id: Double, sql: String, promise: Promise) = settle(promise) {
        live(id).connection.executeBatch(sql)
        null
    }

    /**
     * Copies the database to another file; inillucent opens and checks the copy before returning.
     * @param id - the database id
     * @param path - the copy's file
     * @param promise - resolved with null
     */
    @ReactMethod
    fun backupTo(id: Double, path: String, promise: Promise) = settle(promise) {
        File(path).parentFile?.mkdirs()
        live(id).database.backupTo(File(path))
        null
    }

    /**
     * Reads every page of the database and rejects with the first problem found.
     * @param id - the database id
     * @param promise - resolved with null
     */
    @ReactMethod
    fun integrityCheck(id: Double, promise: Promise) = settle(promise) {
        live(id).database.integrityCheck()
        null
    }

    /**
     * Closes the connection and the database. Closing an id that is not open does nothing.
     * @param id - the database id
     * @param promise - resolved with null
     */
    @ReactMethod
    fun close(id: Double, promise: Promise) = settle(promise) {
        databases.remove(id.toInt())?.let { open ->
            open.connection.close()
            open.database.close()
        }
        null
    }

    /** Closes every database when React Native tears the module down. */
    override fun invalidate() {
        for (id in databases.keys.toList()) {
            databases.remove(id)?.let { open ->
                runCatching { open.connection.close() }
                runCatching { open.database.close() }
            }
        }
        super.invalidate()
    }

    /** The open database for an id, or an exception naming the id. */
    private fun live(id: Double): OpenDatabase =
        databases[id.toInt()] ?: throw IllegalStateException("database ${id.toInt()} is not open")
}

/**
 * Runs work and settles the promise with its result, or rejects with the engine status as the code.
 * @param promise - the promise to settle
 * @param work - the call to make
 */
private inline fun settle(promise: Promise, work: () -> Any?) {
    try {
        promise.resolve(work())
    } catch (failure: InillucentException) {
        promise.reject(failure.status.wireName.uppercase(), failure.engineMessage, failure)
    } catch (failure: Throwable) {
        promise.reject("BRIDGE", failure.message ?: failure.toString(), failure)
    }
}

/**
 * Converts JavaScript parameters to the values the inillucent library binds. A number with no
 * fraction that fits exactly in a double binds as an integer, because JavaScript has one number type
 * and an integer column should get an integer.
 * @param params - the array JavaScript passed
 */
private fun readParams(params: ReadableArray): List<Any?> = (0 until params.size()).map { nth ->
    when (params.getType(nth)) {
        ReadableType.Null -> null
        ReadableType.Boolean -> params.getBoolean(nth)
        ReadableType.Number -> numberValue(params.getDouble(nth))
        ReadableType.String -> params.getString(nth)
        else -> throw IllegalArgumentException("parameter ${nth + 1} is not null, a number, a string or a boolean")
    }
}

/**
 * A JavaScript number as a Long when it is a whole number JavaScript represents exactly, else a Double.
 * @param value - the number
 */
private fun numberValue(value: Double): Any =
    if (value.isFinite() && value == Math.floor(value) && Math.abs(value) <= 9007199254740991.0) value.toLong() else value

/**
 * Writes a result as {columns, rows, changes} for JavaScript.
 * @param rows - what the statement produced
 */
private fun writeRows(rows: Rows): WritableMap {
    val result = Arguments.createMap()
    val columns = Arguments.createArray()
    rows.columns.forEach { columns.pushString(it) }
    val data = Arguments.createArray()
    for (row in rows) data.pushArray(writeRow(row))
    result.putArray("columns", columns)
    result.putArray("rows", data)
    val affected = rows.affected
    if (affected == null) result.putNull("changes") else result.putDouble("changes", affected.toDouble())
    return result
}

/**
 * Writes one row's cells. A blob becomes a hex string in an object, {"blob": "..."}, which is how the
 * engine's own JSON writes one.
 * @param row - the cells
 */
private fun writeRow(row: List<Any?>): WritableArray {
    val cells = Arguments.createArray()
    for (cell in row) {
        when (cell) {
            null -> cells.pushNull()
            is Long -> cells.pushDouble(cell.toDouble())
            is Double -> cells.pushDouble(cell)
            is String -> cells.pushString(cell)
            is ByteArray -> cells.pushMap(Arguments.createMap().apply { putString("blob", cell.joinToString("") { "%02x".format(it) }) })
            else -> cells.pushString(cell.toString())
        }
    }
    return cells
}
