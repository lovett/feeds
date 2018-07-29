'use strict';

const needle = require('needle');
const url = require('url');

module.exports = function (feedUrl, guids, callback) {
    const self = this;

    if (!guids) {
        self.emit('log:debug', 'Skipping recount, no guids');
        return;
    }

    self.emit('log:debug', `Received ${guids.length} guids from ${feedUrl}`);

    if (feedUrl.toLowerCase().indexOf('stackexchange.com') > -1) {
        let questionIdMap = guids.reduce((acc, guid) => {
            const segments = guid.split('/');
            const id = segments.pop();
            const collection = segments.pop();
            if (collection === 'q') {
                acc[id] = guid;
            }
            return acc;
        }, {});

        if (Object.keys(questionIdMap).length === 0) {
            self.emit('log:debug', 'Skipping recount, no question ids');
            return;
        }

        const questionIds = Object.keys(questionIdMap).join(';');

        const parsedUrl = url.parse(feedUrl);
        const siteName = parsedUrl.host.split('.').shift();
        const endpoint = url.format({
            protocol: 'https',
            host: 'api.stackexchange.com',
            pathname: `/2.2/questions/${questionIds}`,
            query: {
                'site': siteName,
                'filter': '!-MOiNm40A8E02xcVeakUTSwMDL*W3ZG-8'
            }
        });

        needle.get(endpoint, (err, res) => {
            if (err) {
                self.emit('log:error', `Failed to query StackExchange API endpoint: ${err.message}`);
                return;
            }

            if (!res.body.items) {
                self.emit('log:warning', 'StackExchange API response has no items');
                return;
            }

            self.db.serialize(() => {
                self.db.run('BEGIN TRANSACTION');


                res.body.items.forEach((item) => {
                    let count = 0;
                    if (item.comment_count) {
                        count += item.comment_count;
                    }

                    if (item.answer_count) {
                        count += item.answer_count;
                    }

                    self.db.run(
                        'UPDATE discussions SET commentCount = ? WHERE label="self" AND entryId=(SELECT id FROM entries WHERE guid=?)',
                        [count, questionIdMap[item.question_id]]
                    );
                });

                self.db.run('COMMIT', [], (err) => {
                    if (err) {
                        self.emit('log:error', err.message);
                    }

                    callback();
                });
            });
        });
    }
};
