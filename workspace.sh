#!/bin/bash

set -e
set -u

PROJECT_ROOT=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

APP_LOG=headlines.log

# Start the server if not already running
tmux start-server 2> /dev/null

# Connect to a session or create a new one
tmux attach-session -d -t "$PROJECT_NAME" || {
    echo "Creating a new session"

    if [ ! -f "$APP_LOG" ]; then
        touch "$APP_LOG"
    fi

    ## 0: Editor
    tmux new-session -d -s "$PROJECT_NAME" bash
    tmux send-keys -t "$PROJECT_NAME" "$EDITOR ." C-m

    ## 1: Shell
    tmux new-window -a -t "$PROJECT_NAME" bash

    ## 2: Server
    tmux new-window -a -t "$PROJECT_NAME" -n "server" "npm run-script server"

    ## 3: Database
    tmux new-window -a -t "$PROJECT_NAME" -n "db" bash

    tmux select-window -t "$PROJECT_NAME":0
    tmux attach-session -t "$PROJECT_NAME"
}
