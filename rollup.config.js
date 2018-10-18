import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'ui/index.js',
    output: {
        file: 'server/static/bundle.js',
        format: 'iife',
        name: 'Headlines',
    },
    plugins: [
        resolve(),
        commonjs()
    ],
    watch: {
        include: 'ui/**/*.js'
    }
};
