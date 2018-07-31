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
# Run the server.
#
server: dummy
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
test: dummy
	mocha --bail --reporter min test/dispatcher

#
# Generate a test coverage report.
#
coverage: dummy
	nyc --reporter=html mocha --bail --reporter min test/dispatcher

#
# Check for coding style violations.
#
lint: dummy
	eslint dispatcher test Gruntfile.js

#
# Generate documentation.
docs: dummy
	jsdoc -c jsdoc.json dispatcher server
