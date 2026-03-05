#!/bin/bash
export PATH="$HOME/.cargo/bin:$PATH"

echo "🚀 Starting Library System..."
echo ""
echo "📦 Backend: http://localhost:8080"
echo "🌐 Frontend: http://localhost:4200"
echo ""

# Start backend in background
echo "▶ Starting Rust Backend..."
(cd backend && cargo run) &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "▶ Starting Angular Frontend..."
(cd frontend && npm start) &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
