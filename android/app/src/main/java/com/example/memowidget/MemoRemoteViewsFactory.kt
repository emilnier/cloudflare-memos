package com.example.memowidget

import android.content.Context
import android.widget.RemoteViews
import android.widget.RemoteViewsService

/**
 * 给 ListView 提供数据行：从 SharedPreferences 里读出缓存的标题列表
 * （由 MemoRefreshWorker 写入），每个标题渲染成一行。
 * ListView 会自动根据小组件可用高度显示尽可能多的行，多余的可以滚动查看。
 */
class MemoRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private var titles: List<String> = emptyList()

    override fun onCreate() {
        loadTitles()
    }

    override fun onDataSetChanged() {
        loadTitles()
    }

    private fun loadTitles() {
        val prefs = context.getSharedPreferences(MemoRefreshWorker.PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(MemoRefreshWorker.KEY_TITLES, "") ?: ""
        titles = if (raw.isBlank()) emptyList() else raw.lines().filter { it.isNotBlank() }
    }

    override fun onDestroy() { titles = emptyList() }

    override fun getCount(): Int = titles.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_memo_item)
        views.setTextViewText(R.id.item_title, titles.getOrNull(position) ?: "")
        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
