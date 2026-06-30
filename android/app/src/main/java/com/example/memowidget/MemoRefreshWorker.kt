package com.example.memowidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * 后台抓取 Worker：请求 /api/widget 纯文本接口，
 * 把结果（每行一个标题）存进 SharedPreferences，
 * 再通知所有小组件的 ListView 数据已变化。
 *
 * 注意：把 WIDGET_API_URL 换成你自己部署的 Worker 地址。
 */
class MemoRefreshWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        // ⚠️ 部署后记得改成你自己的 workers.dev 地址
        const val WIDGET_API_URL = "https://memo-app.YOUR-SUBDOMAIN.workers.dev/api/widget"

        const val PREFS_NAME = "memo_widget_prefs"
        const val KEY_TITLES = "memo_titles"
        const val KEY_LAST_UPDATED = "last_updated"
        const val KEY_LAST_ERROR = "last_error"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val text = fetchText(WIDGET_API_URL)
            val titles = if (text.isBlank()) emptyList() else text.lines().filter { it.isNotBlank() }

            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString(KEY_TITLES, titles.joinToString("\n"))
                .putLong(KEY_LAST_UPDATED, System.currentTimeMillis())
                .remove(KEY_LAST_ERROR)
                .apply()

            notifyWidgets()
            Result.success()
        } catch (e: Exception) {
            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_LAST_ERROR, e.message ?: "未知错误").apply()
            notifyWidgets() // 即使失败也刷新一下 UI，好让用户在空状态里看到错误提示（如有实现）
            Result.retry()
        }
    }

    private fun fetchText(urlStr: String): String {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 10_000
        conn.readTimeout = 10_000
        conn.setRequestProperty("Accept", "text/plain")
        return try {
            val code = conn.responseCode
            if (code !in 200..299) throw RuntimeException("HTTP $code")
            BufferedReader(InputStreamReader(conn.inputStream, Charsets.UTF_8)).use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    private fun notifyWidgets() {
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val ids = appWidgetManager.getAppWidgetIds(
            ComponentName(applicationContext, MemoWidgetProvider::class.java)
        )
        if (ids.isNotEmpty()) {
            appWidgetManager.notifyAppWidgetViewDataChanged(ids, R.id.memo_list)
        }
    }
}
