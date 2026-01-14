# Makefile for kabran-config package management
# Usage: make help

.PHONY: help check publish-patch publish-minor publish-major verify clean

# Load NPM_TOKEN from root .env
ROOT_DIR := $(shell git rev-parse --show-toplevel)
ifneq (,$(wildcard $(ROOT_DIR)/.env))
    include $(ROOT_DIR)/.env
    export NPM_TOKEN
endif

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)kabran-config - Package Management$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@echo "  $(CYAN)check$(RESET)                Check git status and uncommitted changes"
	@echo "  $(CYAN)publish-patch$(RESET)        Publish patch version (1.3.0 → 1.3.1)"
	@echo "  $(CYAN)publish-minor$(RESET)        Publish minor version (1.3.0 → 1.4.0)"
	@echo "  $(CYAN)publish-major$(RESET)        Publish major version (1.3.0 → 2.0.0)"
	@echo "  $(CYAN)verify$(RESET)               Verify published version on registry"
	@echo "  $(CYAN)clean$(RESET)                Clean npm cache and node_modules"
	@echo ""
	@echo "  $(CYAN)patch, minor, major$(RESET)  Aliases for publish-* commands"
	@echo ""
	@echo "$(YELLOW)Examples:$(RESET)"
	@echo "  make publish-patch   # Publish 1.3.0 → 1.3.1"
	@echo "  make publish-minor   # Publish 1.3.0 → 1.4.0"
	@echo "  make publish-major   # Publish 1.3.0 → 2.0.0"

check: ## Run checks before publishing (git status, uncommitted changes)
	@echo "$(CYAN)→ Checking repository status...$(RESET)"
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "$(RED)✗ Uncommitted changes detected. Commit or stash them first.$(RESET)"; \
		git status --short; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Repository is clean$(RESET)"
	@echo ""
	@echo "$(CYAN)→ Current version: $$(node -p "require('./package.json').version")$(RESET)"

publish-patch: check ## Publish patch version (1.3.0 → 1.3.1)
	@echo "$(CYAN)→ Publishing PATCH version...$(RESET)"
	@$(MAKE) _publish VERSION=patch

publish-minor: check ## Publish minor version (1.3.0 → 1.4.0)
	@echo "$(CYAN)→ Publishing MINOR version...$(RESET)"
	@$(MAKE) _publish VERSION=minor

publish-major: check ## Publish major version (1.3.0 → 2.0.0)
	@echo "$(YELLOW)⚠ Publishing MAJOR version (breaking changes)$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(MAKE) _publish VERSION=major; \
	else \
		echo "$(RED)Cancelled$(RESET)"; \
		exit 1; \
	fi

_publish: ## Internal: publish workflow
	@if [ -z "$(NPM_TOKEN)" ]; then \
		echo "$(RED)✗ NPM_TOKEN not found in $(ROOT_DIR)/.env$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)→ Incrementing version: $(VERSION)$(RESET)"
	npm version $(VERSION)
	@NEW_VERSION=$$(node -p "require('./package.json').version"); \
	echo "$(GREEN)✓ New version: $$NEW_VERSION$(RESET)"; \
	echo ""; \
	echo "$(CYAN)→ Publishing to GitHub Packages...$(RESET)"; \
	NPM_TOKEN=$(NPM_TOKEN) npm publish; \
	if [ $$? -eq 0 ]; then \
		echo "$(GREEN)✓ Published @kabran-tecnologia/kabran-config@$$NEW_VERSION$(RESET)"; \
		echo ""; \
		echo "$(CYAN)→ Pushing to remote...$(RESET)"; \
		git push; \
		git push --tags; \
		echo "$(GREEN)✓ Pushed commit and tags$(RESET)"; \
		echo ""; \
		$(MAKE) verify; \
	else \
		echo "$(RED)✗ Publish failed$(RESET)"; \
		exit 1; \
	fi

verify: ## Verify published version on registry
	@echo "$(CYAN)→ Verifying published version...$(RESET)"
	@PUBLISHED_VERSION=$$(npm view @kabran-tecnologia/kabran-config version 2>/dev/null); \
	LOCAL_VERSION=$$(node -p "require('./package.json').version"); \
	if [ "$$PUBLISHED_VERSION" = "$$LOCAL_VERSION" ]; then \
		echo "$(GREEN)✓ Version $$LOCAL_VERSION is published and available$(RESET)"; \
		echo ""; \
		echo "$(CYAN)All published versions:$(RESET)"; \
		npm view @kabran-tecnologia/kabran-config versions; \
	else \
		echo "$(RED)✗ Version mismatch:$(RESET)"; \
		echo "  Local:     $$LOCAL_VERSION"; \
		echo "  Published: $$PUBLISHED_VERSION"; \
		exit 1; \
	fi

clean: ## Clean npm cache and node_modules
	@echo "$(CYAN)→ Cleaning...$(RESET)"
	rm -rf node_modules
	npm cache clean --force
	@echo "$(GREEN)✓ Cleaned$(RESET)"

# Aliases for convenience
patch: publish-patch ## Alias for publish-patch
minor: publish-minor ## Alias for publish-minor
major: publish-major ## Alias for publish-major

.DEFAULT_GOAL := help
