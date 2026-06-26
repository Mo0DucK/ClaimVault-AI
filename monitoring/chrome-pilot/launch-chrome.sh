#!/bin/bash
# Launch Chrome with remote debugging enabled using your real profile data.
#
# Chrome requires --user-data-dir for remote debugging, so we copy your
# real profile into a debug directory. Your logins, cookies, and extensions
# carry over.

PORT="${1:-9222}"
DEBUG_DIR="/tmp/chrome-debug-profile"
REAL_PROFILE="$HOME/Library/Application Support/Google/Chrome"

# Kill any existing Chrome
pkill -9 -f "Google Chrome" 2>/dev/null
sleep 2

# Sync your real profile to the debug directory (preserves logins/cookies)
if [ ! -d "$DEBUG_DIR" ]; then
  echo "Copying Chrome profile (first time, may take a moment)..."
  rsync -a --exclude='SingletonLock' --exclude='SingletonCookie' --exclude='SingletonSocket' \
    "$REAL_PROFILE/" "$DEBUG_DIR/"
  echo "Profile copied."
else
  echo "Updating profile data..."
  rsync -a --exclude='SingletonLock' --exclude='SingletonCookie' --exclude='SingletonSocket' \
    "$REAL_PROFILE/Default/Cookies" "$REAL_PROFILE/Default/Login Data" \
    "$REAL_PROFILE/Default/Login Data For Account" \
    "$DEBUG_DIR/Default/" 2>/dev/null
  echo "Profile updated."
fi

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$DEBUG_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --hide-crash-restore-bubble \
  --disable-session-crashed-bubble \
  "about:blank" &

echo "Chrome launched on debug port $PORT with your profile"
echo "Connect with: node browse.js https://example.com"
