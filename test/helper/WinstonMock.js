var sinon = require('sinon');

var WinstonMock = function () {
    this.silly = sinon.stub();
    this.verbose = sinon.stub();
    this.debug = sinon.stub();
    this.error = sinon.stub();
};

module.exports = WinstonMock;
