#!/bin/bash

npx firebase emulators:start &
EMULATORS_PID=$!;
sleep 2;
npm run test:e2e -- --headless;
kill $EMULATORS_PID;


