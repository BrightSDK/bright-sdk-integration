#!/bin/sh

MAIN_APP_PATH="${CODESIGNING_FOLDER_PATH}"
NET_UPDATER_PATH="${MAIN_APP_PATH}/Contents/Library/LoginItems/net_updater.app"

if [ ! -d "${NET_UPDATER_PATH}" ]; then
  echo "note: net_updater.app not found, skipping resign"
  exit 0
fi

CERTIFICATE_NAME=$(codesign -d --verbose=4 "${MAIN_APP_PATH}" 2>&1 | awk -F= '/^Authority=/{print $2}' | awk '/^(Apple Development|Developer ID Application|Mac Developer):/{print; exit}')
AUTH_NAME="${CERTIFICATE_NAME:-${EXPANDED_CODE_SIGN_IDENTITY_NAME}}"
ORIGINAL_ENTITLEMENTS="${PROJECT_DIR}/${NET_UPDATER_ENTITLEMENTS}"

if [ -z "${ORIGINAL_ENTITLEMENTS}" ] || [ ! -f "${ORIGINAL_ENTITLEMENTS}" ]; then
  echo "warning: net_updater.entitlements not found at ${ORIGINAL_ENTITLEMENTS}, skipping resign"
  exit 0
fi

TEMP_ENTITLEMENTS="${CONFIGURATION_TEMP_DIR}/net_updater.entitlements"
cp -f "${ORIGINAL_ENTITLEMENTS}" "${TEMP_ENTITLEMENTS}"
sed -i "" "s|\${TeamIdentifierPrefix}|${TeamIdentifierPrefix}|g" "${TEMP_ENTITLEMENTS}"
codesign --force --strict --verbose=4 --timestamp --options runtime --sign "${AUTH_NAME}" --entitlements "${TEMP_ENTITLEMENTS}" --deep "${NET_UPDATER_PATH}"
