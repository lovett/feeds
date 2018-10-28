'use strict';

const dateFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

const timeFormat = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric'
});

export default base => class extends base {
    toTimeAndDate(value) {
        const date = dateFormat.format(value);
        const time = timeFormat.format(value);
        return `${date} ${time}`;
    }

    toTimeOrDate(value) {
        const now = dateFormat.format(new Date());
        const date = dateFormat.format(value);
        const time = timeFormat.format(value);
        if (now === date) {
            return time;
        }
        return date;
    }

    toTime(value) {
        return timeFormat.format(value);
    }

};
