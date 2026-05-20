.PHONY: install dev build start lint format test clean

# Node/npm commands
install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

format:
	npm run format

test:
	npm run test

# Utility
clean:
	rm -rf node_modules
	rm -rf .next
	npm cache clean --force
