'use strict';

import Base from './Base';
import DateTimeMixin from '../mixins/DateTime';
import PopulateMixin from '../mixins/Populate';

export default class Entry extends PopulateMixin(DateTimeMixin(Base)) {

    constructor(data) {
        super();
        this.id = null;
        this.url = null;
        this.title = null;
        this.author = null;
        this.created = null;
        this.body = null;
        this.keywords = null;
        this.discussions = null;
        this.populate(data);
    }

    set created(value) {
        this._created = new Date(value * 1000);
    }

    get created() {
        return this.toTimeOrDate(this._created);
    }
}
