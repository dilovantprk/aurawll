#!/bin/bash
# Aura Health Check Script

echo "--- AURA HEALTH CHECK ---"

# 1. Check for root JS files (should only have app.js, firebase.js, sw.js, translations.js, firebase-messaging-sw.js)
echo "Checking for illegal root JS files..."
ROOT_JS=$(ls *.js | grep -vE "app.js|firebase.js|sw.js|translations.js|firebase-messaging-sw.js")
if [ -z "$ROOT_JS" ]; then
    echo "✅ No illegal root JS files found."
else
    echo "❌ Illegal root JS files found: $ROOT_JS"
fi

# 2. Check for broken imports (../../)
echo "Checking for broken imports..."
# Only flag if it's NOT firebase.js or translations.js
BROKEN_IMPORTS=$(grep -rn "from '\.\./\.\." js/ --include="*.js" | grep -vE "firebase.js|translations.js")
if [ -z "$BROKEN_IMPORTS" ]; then
    echo "✅ No broken imports found (root imports for firebase/translations allowed)."
else
    echo "❌ Broken imports found:"
    echo "$BROKEN_IMPORTS"
fi

# 3. Check if style.css imports all components
echo "Checking style.css imports..."
CSS_COMPONENTS=$(ls css/components/*.css | xargs -n 1 basename)
for comp in $CSS_COMPONENTS; do
    if ! grep -q "$comp" style.css; then
        echo "⚠️  $comp is not imported in style.css"
    fi
done

# 4. Check for active console.logs (performance)
echo "Checking for active console.logs..."
# Find lines with console.log that don't start with // or /*
LOG_COUNT=$(grep -r "console.log" js/ --include="*.js" | grep -vE "^[^:]+:[[:space:]]*(\/\/|\/\*)" | wc -l)
echo "Found $LOG_COUNT active console.log instances."

echo "--- CHECK COMPLETE ---"
