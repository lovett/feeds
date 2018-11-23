.PHONY: dummy

export PATH := ./node_modules/.bin:$(PATH)

#
# Check for outdated NPM packages
#
# Uses "or true" after the npm command to prevent a non-zero exit code
# from producing a warning. Non-zero exit here is not an indicator of
# badness.
#
outdated: dummy
	npm outdated || true

#
# Install NPM packages quietly.
#
setup: export NPM_CONFIG_PROGRESS = false
setup:
	npm install


#
# Run the dev server.
#
server: dummy
	pkill -f "nodemon" || true
	nodemon

#
# Wipe out the database.
#
resetdb: dummy
	rm headlines.sqlite
	touch server/server.js

#
# Run the test suite.
#
test: test-dispatcher test-ui

test-dispatcher: dummy
	mocha --bail --reporter min test/dispatcher

test-ui: dummy
	mocha --bail --reporter min ui/test

#
# Generate a test coverage report.
#
coverage: dummy
	nyc --reporter=html mocha --bail --reporter min ui/test coverage/ui

#
# Check for coding style violations.
#
lint: dummy
	eslint dispatcher test

#
# Generate documentation.
#
docs: dummy
	jsdoc -c jsdoc.json dispatcher server

#
# Create a package upgrade commit.
#
# "puc" stands for Package Upgrade Commit
#
puc: dummy
	git checkout master
	git add package.json package-lock.json
	git commit -m "Upgrade npm packages"


ui: dummy
	rollup -c -w
