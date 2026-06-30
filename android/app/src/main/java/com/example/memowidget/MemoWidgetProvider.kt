package com.example.memowidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * 备忘录桌面小组件 Provider。
 * - 列表内容由 [MemoWidgetService] / [MemoRemoteViewsFactory] 提供（自动按可用空间显示尽量多的标题）
 * - 数据抓取统一交给 [MemoRefreshWorker]，避免在主线程/Provider 里直接发网络请求
 */
class MemoWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.example.memowidget.ACTION_REFRESH"
        const val PERIODIC_WORK_NAME = "memo_widget_periodic_refresh"
        const val ONE_OFF_WORK_NAME = "memo_widget_manual_refresh"

        fun buildRemoteViews(context: Context, appWidgetId: Int): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_memo)

            // 绑定 ListView 的数据源（RemoteViewsService）
            val intent = Intent(context, MemoWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                data = android.net.Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.memo_list, intent)
            views.setEmptyView(R.id.memo_list, R.id.empty_view)

            // 刷新按钮 -> 广播给 Provider -> 触发一次性 Worker
            val refreshIntent = Intent(context, MemoWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context, 0, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent)

            return views
        }

        /** 手动刷新：立刻跑一次抓取 Worker */
        fun triggerManualRefresh(context: Context) {
            val request = OneTimeWorkRequestBuilder<MemoRefreshWorker>().build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(ONE_OFF_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }

        /** 定时刷新：每小时一次，省流量也省电量 */
        fun schedulePeriodicRefresh(context: Context) {
            val request = PeriodicWorkRequestBuilder<MemoRefreshWorker>(1, TimeUnit.HOURS)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    PERIODIC_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }

        fun cancelPeriodicRefresh(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK_NAME)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, buildRemoteViews(context, appWidgetId))
        }
        // 每次系统调用 onUpdate（首次添加 / 系统周期更新）顺便拉一次最新数据
        triggerManualRefresh(context)
    }

    override fun onEnabled(context: Context) {
        // 第一个小组件被添加时，启动每小时一次的后台刷新
        schedulePeriodicRefresh(context)
    }

    override fun onDisabled(context: Context) {
        // 最后一个小组件被移除时，取消后台刷新任务，避免无意义耗电耗流量
        cancelPeriodicRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            triggerManualRefresh(context)
        }
    }
}
