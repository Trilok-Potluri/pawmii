/**
 * Expo Config Plugin — Health Connect Permission Delegate
 *
 * react-native-health-connect v3 requires MainActivity.onCreate() to call:
 *     HealthConnectPermissionDelegate.setPermissionDelegate(this)
 *
 * Without this, the internal `lateinit var requestPermission: ActivityResultLauncher`
 * in HealthConnectPermissionDelegate is never initialized. The app crashes with
 * UninitializedPropertyAccessException the moment `requestPermission()` is called
 * from JS — exactly what happens when the user taps "Connect Health Data".
 *
 * The library's own `app.plugin.js` only adds the manifest intent filter. This
 * plugin complements it by patching MainActivity.kt.
 */

const { withMainActivity, withAndroidManifest } = require("@expo/config-plugins");

const IMPORT_LINE =
  "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate";
const DELEGATE_CALL =
  "HealthConnectPermissionDelegate.setPermissionDelegate(this)";

function addImport(contents) {
  if (contents.includes(IMPORT_LINE)) return contents;

  // Insert after the package declaration
  return contents.replace(
    /^(package [^\n]+\n)/m,
    `$1\n${IMPORT_LINE}\n`
  );
}

function addDelegateCall(contents) {
  if (contents.includes(DELEGATE_CALL)) return contents;

  // Case 1: MainActivity already has onCreate(...) — inject the delegate call
  // right after `super.onCreate(...)`.
  const onCreateRegex =
    /(override\s+fun\s+onCreate\s*\([^)]*\)\s*\{[\s\S]*?super\.onCreate\([^)]*\)\s*\n)/;

  if (onCreateRegex.test(contents)) {
    return contents.replace(
      onCreateRegex,
      (match) => `${match}    ${DELEGATE_CALL}\n`
    );
  }

  // Case 2: No onCreate override yet — add one inside the class body.
  // Insert just after the opening brace of `class MainActivity ... {`.
  const classRegex = /(class\s+MainActivity[^{]*\{\s*\n)/;
  if (!classRegex.test(contents)) return contents;

  const onCreateBlock = `
  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    super.onCreate(savedInstanceState)
    ${DELEGATE_CALL}
  }

`;

  return contents.replace(classRegex, `$1${onCreateBlock}`);
}

function withHealthConnectManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure <queries> block has Health Connect package + rationale intent
    if (!manifest.queries) manifest.queries = [{}];
    const queries = manifest.queries[0];
    if (!queries.package) queries.package = [];
    if (!queries.intent) queries.intent = [];

    const hcPkg = "com.google.android.apps.healthdata";
    if (!queries.package.some((p) => p.$?.["android:name"] === hcPkg)) {
      queries.package.push({ $: { "android:name": hcPkg } });
    }
    const rationaleAction = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";
    if (!queries.intent.some((i) => i.action?.[0]?.$?.["android:name"] === rationaleAction)) {
      queries.intent.unshift({ action: [{ $: { "android:name": rationaleAction } }] });
    }

    // Add VIEW_PERMISSION_USAGE + HEALTH_PERMISSIONS to MainActivity
    const app = manifest.application?.[0];
    const mainActivity = app?.activity?.find(
      (a) => a.$?.["android:name"] === ".MainActivity"
    );
    if (mainActivity) {
      if (!mainActivity["intent-filter"]) mainActivity["intent-filter"] = [];
      const viewPermAction = "android.intent.action.VIEW_PERMISSION_USAGE";
      const alreadyHas = mainActivity["intent-filter"].some((f) =>
        f.action?.some((a) => a.$?.["android:name"] === viewPermAction)
      );
      if (!alreadyHas) {
        mainActivity["intent-filter"].push({
          action: [{ $: { "android:name": viewPermAction } }],
          category: [{ $: { "android:name": "android.intent.category.HEALTH_PERMISSIONS" } }],
        });
      }
    }

    return config;
  });
}

const withHealthConnectDelegate = (config) => {
  config = withHealthConnectManifest(config);
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      throw new Error(
        "withHealthConnectDelegate only supports Kotlin MainActivity. " +
          "Set expo-build-properties to use Kotlin or update this plugin."
      );
    }
    let contents = config.modResults.contents;
    contents = addImport(contents);
    contents = addDelegateCall(contents);
    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withHealthConnectDelegate;
