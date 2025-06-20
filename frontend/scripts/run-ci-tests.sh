#!/bin/bash

# Run CI Tests script
# This script runs all the tests that we've successfully migrated to Vitest

echo "Running CI tests for migrated components..."

# Run the passing tests
npx vitest run \
  src/components/events/PersonEventsList.test.tsx \
  src/components/family-tree/EditPersonForm.test.tsx \
  src/components/family-tree/FamilyTreeDisplay.test.tsx \
  src/components/ui/EditorToolbar.test.tsx \
  src/components/ui/RichTextEditor.test.tsx

# Get the exit code from Vitest
EXIT_CODE=$?

# Report results
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All migrated tests are passing!"
else
  echo "❌ Some tests are failing. Check the output above for details."
fi

# Return the exit code from Vitest
exit $EXIT_CODE
