#!/usr/bin/env bash
set -euo pipefail

SESSION_ID="${CORTEX_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  echo "No session ID available, skipping." >&2
  exit 0
fi

TMPFILE=$(mktemp /tmp/cortex_session_XXXXXX.json)
trap "rm -f $TMPFILE" EXIT

# Write transcript directly to file (JSONL format, one JSON object per line)
cortex conversations transcript "$SESSION_ID" --output=json > "$TMPFILE" 2>/dev/null || exit 0

if [ ! -s "$TMPFILE" ]; then
  exit 0
fi

MSG_COUNT=$(wc -l < "$TMPFILE" | tr -d ' ')

# Convert JSONL to JSON array
jq -s '.' "$TMPFILE" > "${TMPFILE}.arr" && mv "${TMPFILE}.arr" "$TMPFILE"

# PUT to table stage (file lands as session_id.json at stage root)
snow sql -q "REMOVE @CORTEX_CODE_LOGS.PUBLIC.%SESSION_HISTORY/${SESSION_ID}.json" -c dev 2>/dev/null || true
snow sql -q "PUT 'file://$TMPFILE' '@CORTEX_CODE_LOGS.PUBLIC.%SESSION_HISTORY' AUTO_COMPRESS=FALSE OVERWRITE=TRUE" -c dev 2>/dev/null || {
  echo "Failed to PUT session file for $SESSION_ID" >&2
  exit 1
}

# Get the actual uploaded filename
STAGED_NAME=$(basename "$TMPFILE")

USER_NAME=$(snow sql -q "SELECT CURRENT_USER()" -c dev --format json 2>/dev/null | jq -r '.[0]."CURRENT_USER()"' 2>/dev/null || whoami)

# Delete existing row if re-running
snow sql -q "DELETE FROM CORTEX_CODE_LOGS.PUBLIC.SESSION_HISTORY WHERE SESSION_ID = '${SESSION_ID}'" -c dev 2>/dev/null || true

# COPY INTO with transformation
snow sql -q "
COPY INTO CORTEX_CODE_LOGS.PUBLIC.SESSION_HISTORY (SESSION_ID, USER_NAME, TITLE, MESSAGE_COUNT, TRANSCRIPT)
FROM (
  SELECT
    '${SESSION_ID}',
    '${USER_NAME}',
    '',
    ${MSG_COUNT},
    \$1
  FROM @CORTEX_CODE_LOGS.PUBLIC.%SESSION_HISTORY/${STAGED_NAME}
)
FILE_FORMAT = (TYPE = JSON STRIP_OUTER_ARRAY = FALSE)
" -c dev 2>&1 || echo "Failed to COPY session $SESSION_ID" >&2

# Cleanup stage
snow sql -q "REMOVE @CORTEX_CODE_LOGS.PUBLIC.%SESSION_HISTORY/${STAGED_NAME}" -c dev 2>/dev/null || true
