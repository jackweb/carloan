SHELL := /bin/bash

RUN_DIR := $(CURDIR)/run

FRONTEND_CMD := node_modules/.bin/vite --port 5173

# Marker each service's command line must contain for its pid file to count as live.
frontend_MARKER := vite

.DEFAULT_GOAL := all
.PHONY: all backend frontend stop frontend-deps

all: backend frontend

# Backend and postgres run in docker compose (see docker-compose.yml).
backend:
	docker compose up -d --build

frontend: frontend-deps
	$(call start,frontend,frontend,$(FRONTEND_CMD))

frontend-deps:
	@[ -d frontend/node_modules ] || (cd frontend && npm install)

# $(call start,<name>,<dir>,<command>)
# Starts <command> in <dir> in its own session (pid == process group id) unless
# run/<name>.pid already points at a live process whose command line contains
# the service's marker. A pid file pointing anywhere else is removed.
define start
	@mkdir -p $(RUN_DIR)
	@pidfile=$(RUN_DIR)/$(1).pid; \
	if [ -f $$pidfile ]; then \
		pid=$$(cat $$pidfile); \
		if ps -p "$$pid" -o args= 2>/dev/null | grep -q -- '$($(1)_MARKER)'; then \
			echo "$(1) already running (pid $$pid)"; \
			exit 0; \
		fi; \
		echo "$(1): pid file is stale, removing it"; \
		rm -f $$pidfile; \
	fi; \
	(cd $(2) && exec setsid $(3) > $(RUN_DIR)/$(1).log 2>&1 < /dev/null) & \
	echo $$! > $$pidfile; \
	echo "$(1) started (pid $$!), log: run/$(1).log"
endef

stop:
	docker compose down
	@for name in frontend; do \
		pidfile=$(RUN_DIR)/$$name.pid; \
		[ -f $$pidfile ] || continue; \
		pid=$$(cat $$pidfile); \
		marker='$(frontend_MARKER)'; \
		if ps -p "$$pid" -o args= 2>/dev/null | grep -q -- "$$marker"; then \
			kill -TERM -- -$$pid 2>/dev/null; \
			for i in 1 2 3 4 5 6 7 8 9 10; do \
				kill -0 -- -$$pid 2>/dev/null || break; \
				sleep 0.5; \
			done; \
			kill -KILL -- -$$pid 2>/dev/null; \
			echo "$$name stopped (pid $$pid)"; \
		else \
			echo "$$name was not running"; \
		fi; \
		rm -f $$pidfile; \
	done
