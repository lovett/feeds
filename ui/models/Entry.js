'use strict';

import m from 'mithril';
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
        this.saved = false;
        this.read = false;
        this.populate(data);
    }

    set created(value) {
        this._created = new Date(value * 1000);
    }

    get created() {
        return this.toTimeOrDate(this._created);
    }

    save() {
        return m.request({
            method: 'PATCH',
            url: this.links.save_entry,
            withCredentials: true,
        }).then(res => {
            this.saved = true;
        }).catch(e => {
            console.log('could not save');
        });
    }

    unsave() {
        return m.request({
            method: 'PATCH',
            url: this.links.unsave_entry,
            withCredentials: true,
        }).then(res => {
            this.saved = false;
        }).catch(e => {
            console.log('cound not unsave');
        });
    }
}
