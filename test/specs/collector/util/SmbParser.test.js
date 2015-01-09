var buster = require('buster');

var loadFixture = rootRequire('./test/helper/FixtureLoader').load,
    SmbParser = rootRequire('./src/collector/util/SmbParser');

var assert = buster.referee.assert,
    refute = buster.referee.refute;

buster.testCase('collector.util.SmbParser', {
    'ls': function () {
        var input = loadFixture('smb-ls.txt'),
            result = SmbParser.ls(input);

        assert.equals(
            result.files,
            [
                {
                    name: 'Heretic - Saviour.xm',
                    size: 1497954, date: new Date('2012-12-11 08:50:45')
                }, {
                    name: 'Keith303 - Amphetamine.xm',
                    size: 965654, date: new Date('2012-12-11 08:56:05')
                }, {
                    name: 'KoM\'AH - A Walk In The Park.mp3',
                    size: 11849769, date: new Date('2012-12-11 08:59:11')
                }, {
                    name: 'KoM\'AH - Fog.mp3',
                    size: 11098697, date: new Date('2012-12-11 08:58:19')
                }, {
                    name: 'KoM\'AH - Mary Crystal (Give Me Wings).mp3',
                    size: 12804597, date: new Date('2012-12-11 08:58:01')
                }, {
                    name: 'KoM\'AH - Permian Organsim.mp3',
                    size: 15440248, date: new Date('2012-12-11 08:59:00')
                }, {
                    name: 'KoM\'AH - Resonator.mp3',
                    size: 9703758, date: new Date('2012-12-11 08:58:33')
                }
            ]
        );

        assert.equals(
            result.directories,
            [
                { name: '.', date: new Date('2014-12-12 15:02:26') },
                { name: '..', date: new Date('2014-12-12 15:02:26') },
                { name: 'bla', date: new Date('2014-12-12 15:02:25') },
                { name: 'blub', date: new Date('2014-12-12 15:01:43') }
            ]
        );
    },

    'du': function () {
        var input = loadFixture('smb-du.txt'),
            result = SmbParser.du(input);

        assert.equals(
            result,
            {
                total: 63360677,
                blocks: {
                    count: 52474,
                    size: 4194304,
                    available: 4646
                }
            }
        );
    }
});
