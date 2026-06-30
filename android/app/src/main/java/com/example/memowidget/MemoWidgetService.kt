package com.example.memowidget

import android.content.Intent
import android.widget.RemoteViewsService

class MemoWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return MemoRemoteViewsFactory(applicationContext)
    }
}
