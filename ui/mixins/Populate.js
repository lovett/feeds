'use strict';

export default base => class extends base {
    populate(data) {
        this.labels = {};
        this.links = {};

        for (let key of Object.keys(data)) {
            if (key === '_links') {
                this.links = data[key];
                continue;
            }

            this.labels[key] = data[key].label;
            this[key] = data[key].value;
        }
    }
};
