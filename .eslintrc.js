module.exports = {
    root: true,
    env: {
        browser: true,
        node: true
    },
    parserOptions: {
        parser: '@babel/eslint-parser',
        requireConfigFile: false
    },
    extends: [
    ],
    plugins: [
        'vue'
    ],
    // add your custom rules here
    rules: {
        "no-console": "off",
        "vue/no-v-html":"off",
        "array-callback-return": "off",
        'vue/no-use-v-if-with-v-for':'off'
    },
    globals: {
        "$": true,
        'global': true,
        'window': true,
        'v-html': true,
    }
}