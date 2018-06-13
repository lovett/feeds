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
packages: export NPM_CONFIG_PROGRESS = false
packages:
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
