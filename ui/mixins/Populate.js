'use strict';

export default base => class extends base {
    populate(data) {
        this.labels = {};
        for (let key of Object.keys(data)) {
            const value = data[key].value;

            this.labels[key] = data[key].label;
            this[key] = data[key].value;
        }
    }
};
