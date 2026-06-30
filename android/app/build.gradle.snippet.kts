// 把这些依赖合并进你 app/build.gradle(.kts) 的 dependencies {} 块里
// （版本号写的是 2026 年中较新的稳定版，如已有更新版本可直接用你项目里的）

dependencies {
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.core:core-ktx:1.13.1")
}

// 同时确保 app/build.gradle(.kts) 顶部有：
// plugins { id("org.jetbrains.kotlin.android") ... }
// android { compileSdk = 34; defaultConfig { minSdk = 23; targetSdk = 34 } }
