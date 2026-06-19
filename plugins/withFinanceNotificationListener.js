const { AndroidConfig, withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULE_NAME = 'FinanceNotificationListener';

function getPackageName(config) {
  return AndroidConfig.Package.getPackage(config);
}

function ensureService(manifest, packageName) {
  const app = manifest.manifest.application?.[0];
  if (!app) return manifest;

  app.service = app.service ?? [];
  const serviceName = `.${MODULE_NAME.toLowerCase()}.${MODULE_NAME}Service`;
  const exists = app.service.some((service) => service.$?.['android:name'] === serviceName);
  if (!exists) {
    app.service.push({
      $: {
        'android:name': serviceName,
        'android:label': 'Finance notification import',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.service.notification.NotificationListenerService',
              },
            },
          ],
        },
      ],
    });
  }

  return manifest;
}

function injectMainApplication(src, packageName) {
  const importLine = `import ${packageName}.${MODULE_NAME.toLowerCase()}.${MODULE_NAME}Package`;
  let next = src.includes(importLine)
    ? src
    : src.replace(/(package [^\n]+\n)/, `$1\n${importLine}\n`);

  if (next.includes(`${MODULE_NAME}Package()`)) return next;

  next = next.replace(
    /PackageList\(this\)\.packages\.apply\s*\{/,
    `PackageList(this).packages.apply {\n        add(${MODULE_NAME}Package())`,
  );

  next = next.replace(
    /val packages = PackageList\(this\)\.packages(?!\.apply)/,
    `val packages = PackageList(this).packages\n        packages.add(${MODULE_NAME}Package())`,
  );

  return next;
}

function serviceSource(packageName) {
  return `package ${packageName}.${MODULE_NAME.toLowerCase()}

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

class ${MODULE_NAME}Service : NotificationListenerService() {
  private val allowedPackages = listOf(
    "com.maybank2u.life",
    "my.com.maybank2u.m2umobile",
    "com.cimbmalaysia",
    "com.cimbbank.my",
    "com.pb.mobile",
    "com.rhb.mobilebanking",
    "com.hlb.my.com.hongleongconnect",
    "my.com.tngdigital.ewallet",
    "my.com.myboost",
    "my.gov.kwsp.ikaun",
    "my.com.versa"
  )
  private val sensitivePattern = Regex(
    "(otp|tac|verification|verify|security code|kod|one[-\\\\s]?time|password|passcode|login|secure2u|authori[sz]e|authentication)",
    RegexOption.IGNORE_CASE
  )

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val packageName = sbn.packageName ?: return
    if (allowedPackages.none { packageName.contains(it, ignoreCase = true) }) return

    val extras = sbn.notification.extras ?: return
    val title = extras.getCharSequence("android.title")?.toString()?.trim().orEmpty()
    val text = listOfNotNull(
      extras.getCharSequence("android.text")?.toString(),
      extras.getCharSequence("android.bigText")?.toString()
    ).joinToString(" ").trim()
    val combined = "$title $text"
    if (text.isBlank() || sensitivePattern.containsMatchIn(combined)) return

    val payload = JSONObject()
      .put("sourceApp", getAppLabel(packageName))
      .put("sourcePackage", packageName)
      .put("title", title.take(120))
      .put("text", text.take(220))
      .put("postedAt", sbn.postTime)

    val prefs = getSharedPreferences("finance_notification_imports", MODE_PRIVATE)
    val current = JSONArray(prefs.getString("pending", "[]"))
    current.put(payload)
    prefs.edit().putString("pending", current.toString()).apply()
  }

  private fun getAppLabel(packageName: String): String {
    return try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      packageName
    }
  }
}
`;
}

function moduleSource(packageName) {
  return `package ${packageName}.${MODULE_NAME.toLowerCase()}

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONArray

class ${MODULE_NAME}Module(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "${MODULE_NAME}"

  @ReactMethod
  fun isNotificationAccessEnabled(promise: Promise) {
    val enabledListeners = Settings.Secure.getString(
      reactContext.contentResolver,
      "enabled_notification_listeners"
    )
    val component = ComponentName(reactContext, ${MODULE_NAME}Service::class.java)
    promise.resolve(!TextUtils.isEmpty(enabledListeners) && enabledListeners.contains(component.flattenToString()))
  }

  @ReactMethod
  fun openNotificationListenerSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("OPEN_SETTINGS_FAILED", error)
    }
  }

  @ReactMethod
  fun consumePendingNotifications(promise: Promise) {
    try {
      val prefs = reactContext.getSharedPreferences("finance_notification_imports", 0)
      val raw = prefs.getString("pending", "[]") ?: "[]"
      val json = JSONArray(raw)
      val output = WritableNativeArray()
      for (index in 0 until json.length()) {
        val item = json.getJSONObject(index)
        val map = WritableNativeMap()
        map.putString("sourceApp", item.optString("sourceApp"))
        map.putString("sourcePackage", item.optString("sourcePackage"))
        map.putString("title", item.optString("title"))
        map.putString("text", item.optString("text"))
        map.putDouble("postedAt", item.optDouble("postedAt"))
        output.pushMap(map)
      }
      prefs.edit().putString("pending", "[]").apply()
      promise.resolve(output)
    } catch (error: Exception) {
      promise.reject("CONSUME_FAILED", error)
    }
  }
}
`;
}

function packageSource(packageName) {
  return `package ${packageName}.${MODULE_NAME.toLowerCase()}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ${MODULE_NAME}Package : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(${MODULE_NAME}Module(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;
}

module.exports = function withFinanceNotificationListener(config) {
  config = withAndroidManifest(config, (manifestConfig) => {
    const packageName = getPackageName(manifestConfig);
    manifestConfig.modResults = ensureService(manifestConfig.modResults, packageName);
    return manifestConfig;
  });

  config = withMainApplication(config, (mainConfig) => {
    const packageName = getPackageName(mainConfig);
    mainConfig.modResults.contents = injectMainApplication(mainConfig.modResults.contents, packageName);
    return mainConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (dangerousConfig) => {
      const packageName = getPackageName(dangerousConfig);
      const packagePath = packageName.replace(/\./g, path.sep);
      const dir = path.join(
        dangerousConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...packagePath.split(path.sep),
        MODULE_NAME.toLowerCase(),
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${MODULE_NAME}Service.kt`), serviceSource(packageName));
      fs.writeFileSync(path.join(dir, `${MODULE_NAME}Module.kt`), moduleSource(packageName));
      fs.writeFileSync(path.join(dir, `${MODULE_NAME}Package.kt`), packageSource(packageName));
      return dangerousConfig;
    },
  ]);
};
