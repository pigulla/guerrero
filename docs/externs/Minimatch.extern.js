/**
 * A minimal matching utility.
 *
 * This is the matching library used internally by npm.
 *
 * Eventually, it will replace the C binding in node-glob.
 *
 * It works by converting glob expressions into JavaScript `RegExp` objects.
 *
 * @class minimatch
 * @author Isaac Z. Schlueter <i@izs.me>
 */

//<editor-fold desc="minimatch">
/**
 * Dump a ton of stuff to stderr.
 *
 * @cfg {boolean} [debug=false]
 */

/**
 * Do not expand `{a,b}` and `{1..3}` brace sets.
 *
 * @cfg {boolean} [nobrace=false]
 */

/**
 * Disable `**` matching against multiple folder names.
 *
 * @cfg {boolean} [noglobstar=false]
 */

/**
 * Allow patterns to match filenames starting with a period, even if the pattern does not explicitly have a period in
 * that spot.
 *
 * Note that by default, `a/** /b` will *not* match `a/.d/b`, unless `dot` is set.
 *
 * @cfg {boolean} [dot=false]
 */

/**
 * Disable "extglob" style patterns like `+(a|b)`.
 *
 * @cfg {boolean} [noext=false]
 */

/**
 * Perform a case-insensitive match.
 *
 * @cfg {boolean} [nocase=false]
 */

/**
 * When a match is not found by {@see #match}, return a list containing the pattern itself. When set, an empty list
 * is returned if there are no matches.
 *
 * @cfg {boolean} [nonull=false]
 */

/**
 * If set, then patterns without slashes will be matched against the basename of the path if it contains slashes. For
 * example, `a?b` would match the path `/xyz/123/acb`, but not `/xyz/acb/123`.
 *
 * @cfg {boolean} [matchBase=false]
 */

/**
 * Suppress the behavior of treating `#` at the start of a pattern as a comment.
 *
 * @cfg {boolean} [nocomment=false]
 */

/**
 * Suppress the behavior of treating a leading `!` character as negation.
 *
 * @cfg {boolean} [nonegate=false]
 */

/**
 * Returns from negate expressions the same as if they were not negated. (Ie, true on a hit, false on a miss.)
 *
 * @cfg {boolean} [flipNegate=false]
 */

/**
 * Main export. Tests a path against the pattern using the options.
 *
 *     var isJS = minimatch(file, "*.js", { matchBase: true })
 *
 * @member minimatch
 * @method minimatch
 * @static
 * @param {string} path
 * @param {string} pattern
 * @param {Object} options
 * @return {boolean}
 */

/**
 * Returns a function that tests its supplied argument, suitable for use with `Array.filter`. Example:
 *
 *     var javascripts = fileList.filter(minimatch.filter("*.js", {matchBase: true}))
 *
 * @member minimatch
 * @method filter
 * @static
 * @param {string} pattern
 * @param {Object} options
 */

/**
 * Match against the list of files, in the style of `fnmatch` or `glob`. If nothing is matched, and `options.nonull` is
 * set, then return a list containing the pattern itself.
 *
 *     var javascripts = fileList.filter(minimatch.filter("*.js", {matchBase: true}))
 *
 * @member minimatch
 * @method match
 * @static
 * @param {string} pattern
 * @param {Object} options
 */

/**
 * Make a regular expression object from the pattern.
 *
 * @member minimatch
 * @method makeRe
 * @static
 * @param {string} pattern
 * @param {Object} options
 */
//</editor-fold>

//<editor-fold desc="minimatch.Minimatch">
/**
 * Create a minimatch object by instantiating the `minimatch.Minimatch` class.
 *
 *     var Minimatch = require("minimatch").Minimatch
 *     var mm = new Minimatch(pattern, options)
 *
 * @class minimatch.Minimatch
 */

/**
 * The original pattern the minimatch object represents.
 *
 * @member minimatch.Minimatch
 * @property {string} pattern
 */

/**
 * The options supplied to the constructor.
 *
 * @member minimatch.Minimatch
 * @property {Object} options
 */

/**
 * A 2-dimensional array of regexp or string expressions. Each row in the array corresponds to a brace-expanded pattern.
 * Each item in the row corresponds to a single path-part. For example, the pattern `{a,b/c}/d` would expand to a set of
 * patterns like:
 *
 *     [ [ a, d ]
 *     , [ b, c, d ] ]
 *
 * If a portion of the pattern doesn't have any "magic" in it (that is, it's something like `"foo"` rather than
 * `fo*o?`), then it will be left as a string rather than converted to a regular expression.
 *
 * @member minimatch.Minimatch
 * @property {Array.<Array.<string|RegExp>>} set
 */

/**
 * Created by the {@link #makeRe} method. A single regular expression expressing the entire pattern. This is useful in
 * cases where you wish to use the pattern somewhat like `fnmatch(3)` with `FNM_PATH` enabled.
 *
 * @member minimatch.Minimatch
 * @property {RegExp} regexp
 */

/**
 * True if the pattern is negated.
 *
 * @member minimatch.Minimatch
 * @property {boolean} negate
 */

/**
 * True if the pattern is a comment.
 *
 * @member minimatch.Minimatch
 * @property {boolean} comment
 */

/**
 * True if the pattern is `""`.
 *
 * @member minimatch.Minimatch
 * @property {boolean} empty
 */

/**
 * Generate the `regexp` member if necessary, and return it. Will return `false` if the pattern is invalid.
 *
 * @member minimatch.Minimatch
 * @method makeRe
 * @return {RegExp|boolean}
 */

/**
 * Return true if the filename matches the pattern, or false otherwise.
 *
 * @member minimatch.Minimatch
 * @method match
 * @param {string} fname
 * @return {boolean}
 */

/**
 * Take a `/`-split filename, and match it against a single row in the `regExpSet`. This method is mainly for internal
 * use, but is exposed so that it can be used by a glob-walker that needs to avoid excessive filesystem calls.
 *
 * @member minimatch.Minimatch
 * @method matchOne
 * @param {Array.<string>} fileArray
 * @param {Array.<RegExp>} patternArray
 * @param {boolean} partial
 */
//</editor-fold>
