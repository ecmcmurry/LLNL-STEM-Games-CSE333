module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/chemistry.unit.test.js'],
    collectCoverageFrom: [
        'main.js',
        'reactions.js',
        'swapScreen.js',
        '!node_modules/**'
    ],
};