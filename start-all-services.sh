#!/bin/bash

# Start the map microservice in the background
echo "Starting map microservice..."
cd map-service && node server.js &
MAP_PID=$!

# Wait a moment for the map service to start
sleep 2

# Start the main application
echo "Starting main EUDR application..."
cd ..
npm run dev

# If main application exits, kill the map service
kill $MAP_PID 2>/dev/null