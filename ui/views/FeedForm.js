'use strict';

import m from 'mithril';
import Subscription from '../models/Subscription';
import FormFieldGroup from './FormFieldGroup';

export default {
    view: function (vnode) {
        let fields = Subscription.fields.reduce((accumulator, field) => {
            if (Subscription.adding && field.create === false) {
                return accumulator;
            }

            if (Subscription.editing && field.type === 'hidden') {
                accumulator.push(m('input', {
                    type: field.type,
                    name: field.name,
                    value: vnode.attrs.values[field.name]
                }));
                return accumulator;
            }

            if (Subscription.editing && field.update === false) {
                return accumulator;
            }

            let fieldGroup = m(FormFieldGroup, [
                m('label', field.title),
                m('input', {
                    type: field.type,
                    name: field.name,
                    oninput: m.withAttr('value', (value) => {
                        vnode.attrs.values[field.name] = value;
                    }),
                    required: field.required,
                    value: vnode.attrs.values[field.name]
                })
            ]);

            accumulator.push(fieldGroup);
            return accumulator;
        }, []);

        let buttons = [
            m('button', 'save')
        ];

        if (vnode.attrs.values.id) {
            buttons.push(m('button', {
                onclick: function (e) {
                    e.preventDefault();
                    Subscription.remove(vnode.attrs.values);
                    m.route.set('/');
                }
            }, 'unsubscribe'));
        }

        fields.push(
            m(FormFieldGroup, buttons)
        );

        let formAttrs = {
            hidden: vnode.attrs.hidden,
            onsubmit: function (e) {
                e.preventDefault();
                Subscription.save(vnode.attrs.values);
            }
        };

        return m('form', formAttrs, fields);
    }
};
