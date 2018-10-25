'use strict';

export default class FetchStat {

    constructor(data) {
        this.created = null;
        this.httpStatus = null;
        this.entryCount = null;
        this.labels = {};

        for (let key of Object.keys(data)) {
            const value = data[key].value;

            this.labels[key] = data[key].label;
            this[key] = data[key].value;
        }
    }

    set created(value) {
        this._created = new Date(value * 1000);
    }

    get created() {
        return this._created.toLocaleString();
    }
}
